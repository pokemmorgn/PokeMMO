// client/src/game/QuestSystem.js

import { QuestJournalUI } from '../components/QuestJournalUI.js';

export class QuestSystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.questJournal = null;
    this.trackedQuest = null;
    this.questNotifications = [];
    
    this.init();
  }

  init() {
    // Créer l'interface du journal
    this.questJournal = new QuestJournalUI(this.gameRoom);
    
    // Écouter les événements du serveur
    this.setupServerListeners();
    
    // Rendre le système accessible globalement
    window.questSystem = this;
    
    console.log("🎯 Système de quêtes initialisé");
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Interaction NPC avec quêtes
    this.gameRoom.onMessage("npcInteractionResult", (data) => {
      this.handleNpcInteraction(data);
    });

    // Résultat de démarrage de quête
    this.gameRoom.onMessage("questStartResult", (data) => {
      if (data.success) {
        this.showNotification(`Quête acceptée : ${data.quest?.name || 'Nouvelle quête'}`, 'success');
      } else {
        this.showNotification(data.message, 'error');
      }
    });

    // Liste des quêtes disponibles pour un NPC
    this.gameRoom.onMessage("availableQuestsList", (data) => {
      this.showAvailableQuests(data.quests);
    });

    // Progression de quête
    this.gameRoom.onMessage("questProgressUpdate", (results) => {
      this.handleQuestProgressUpdate(results);
    });

    // Notifications de quêtes terminées
    this.gameRoom.onMessage("questRewards", (data) => {
      this.showQuestRewards(data);
    });
  }

  handleNpcInteraction(data) {
    switch (data.type) {
      case 'questGiver':
        this.showQuestGiverDialog(data);
        break;
        
      case 'questComplete':
        this.showQuestCompleteDialog(data);
        break;
        
      case 'questProgress':
        this.showNotification(data.message, 'info');
        break;
        
      default:
        // Gestion normale des NPCs (dialogue, shop, etc.)
        this.handleRegularNpcInteraction(data);
        break;
    }
  }

  showQuestGiverDialog(data) {
    if (!data.availableQuests || data.availableQuests.length === 0) return;

    // Créer une interface pour choisir parmi les quêtes disponibles
    const questDialog = this.createQuestDialog('Quêtes disponibles', data.availableQuests, (questId) => {
      this.startQuest(questId);
    });

    document.body.appendChild(questDialog);
  }

  showQuestCompleteDialog(data) {
    const message = data.message || "Félicitations ! Vous avez terminé une quête !";
    
    // Créer une interface de félicitations avec les récompenses
    const completeDialog = this.createQuestCompleteDialog(message, data.questRewards);
    document.body.appendChild(completeDialog);
  }

  createQuestDialog(title, quests, onSelectQuest) {
    const dialog = document.createElement('div');
    dialog.className = 'quest-dialog-overlay';
    dialog.innerHTML = `
      <div class="quest-dialog">
        <div class="quest-dialog-header">
          <h3>${title}</h3>
          <button class="quest-dialog-close">✕</button>
        </div>
        <div class="quest-dialog-content">
          ${quests.map(quest => `
            <div class="quest-option" data-quest-id="${quest.id}">
              <div class="quest-option-header">
                <strong>${quest.name}</strong>
                <span class="quest-category ${quest.category}">${quest.category?.toUpperCase()}</span>
              </div>
              <p class="quest-option-description">${quest.description}</p>
              <div class="quest-option-steps">
                <strong>Première étape :</strong> ${quest.steps[0]?.description || 'Non spécifiée'}
              </div>
              ${quest.steps[0]?.rewards ? `
                <div class="quest-option-rewards">
                  <strong>Récompenses :</strong> 
                  ${quest.steps[0].rewards.map(r => this.formatReward(r)).join(', ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        <div class="quest-dialog-actions">
          <button class="quest-btn-cancel">Annuler</button>
          <button class="quest-btn-accept" disabled>Accepter</button>
        </div>
      </div>
    `;

    this.styleQuestDialog(dialog);
    this.addQuestDialogListeners(dialog, onSelectQuest);
    
    return dialog;
  }

  createQuestCompleteDialog(message, rewards) {
    const dialog = document.createElement('div');
    dialog.className = 'quest-dialog-overlay';
    dialog.innerHTML = `
      <div class="quest-dialog quest-complete-dialog">
        <div class="quest-dialog-header">
          <h3>🎉 Quête terminée !</h3>
        </div>
        <div class="quest-dialog-content">
          <p class="quest-complete-message">${message}</p>
          ${rewards && rewards.length > 0 ? `
            <div class="quest-complete-rewards">
              <h4>Récompenses reçues :</h4>
              ${rewards.map(reward => `
                <div class="quest-reward-item">
                  ${this.formatReward(reward)}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="quest-dialog-actions">
          <button class="quest-btn-accept">Continuer</button>
        </div>
      </div>
    `;

    this.styleQuestDialog(dialog);
    
    // Auto-fermeture après quelques secondes
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.remove();
      }
    }, 5000);

    dialog.querySelector('.quest-btn-accept').addEventListener('click', () => {
      dialog.remove();
    });
    
    return dialog;
  }

  styleQuestDialog(dialog) {
    const style = document.createElement('style');
    if (!document.querySelector('#quest-dialog-styles')) {
      style.id = 'quest-dialog-styles';
      style.textContent = `
        .quest-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1050;
          backdrop-filter: blur(5px);
        }

        .quest-dialog {
          background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98));
          border: 2px solid rgba(100, 149, 237, 0.8);
          border-radius: 15px;
          max-width: 500px;
          max-height: 70vh;
          width: 90%;
          color: white;
          font-family: Arial, sans-serif;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
        }

        .quest-dialog-header {
          background: rgba(100, 149, 237, 0.2);
          padding: 15px 20px;
          border-bottom: 1px solid rgba(100, 149, 237, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quest-dialog-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .quest-dialog-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(220, 53, 69, 0.8);
        }

        .quest-dialog-close:hover {
          background: rgba(220, 53, 69, 1);
        }

        .quest-dialog-content {
          max-height: 300px;
          overflow-y: auto;
          padding: 20px;
        }

        .quest-option {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .quest-option:hover {
          background: rgba(100, 149, 237, 0.1);
          border-color: rgba(100, 149, 237, 0.3);
        }

        .quest-option.selected {
          border-color: #64b5f6;
          background: rgba(100, 149, 237, 0.2);
        }

        .quest-option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .quest-category {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .quest-category.main { background: rgba(255, 193, 7, 0.3); color: #ffc107; }
        .quest-category.side { background: rgba(40, 167, 69, 0.3); color: #28a745; }
        .quest-category.daily { background: rgba(220, 53, 69, 0.3); color: #dc3545; }

        .quest-option-description {
          font-size: 14px;
          color: #ccc;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .quest-option-steps,
        .quest-option-rewards {
          font-size: 12px;
          color: #bbb;
          margin-bottom: 5px;
        }

        .quest-dialog-actions {
          padding: 15px 20px;
          border-top: 1px solid rgba(100, 149, 237, 0.3);
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .quest-btn-cancel,
        .quest-btn-accept {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .quest-btn-cancel {
          background: rgba(108, 117, 125, 0.3);
          color: #ccc;
        }

        .quest-btn-accept {
          background: rgba(40, 167, 69, 0.8);
          color: white;
        }

        .quest-btn-accept:disabled {
          background: rgba(108, 117, 125, 0.3);
          cursor: not-allowed;
        }

        .quest-btn-cancel:hover {
          background: rgba(108, 117, 125, 0.5);
        }

        .quest-btn-accept:hover:not(:disabled) {
          background: rgba(40, 167, 69, 1);
        }

        .quest-complete-dialog {
          text-align: center;
        }

        .quest-complete-message {
          font-size: 16px;
          margin-bottom: 15px;
          color: #64b5f6;
        }

        .quest-complete-rewards h4 {
          color: #ffc107;
          margin-bottom: 10px;
        }

        .quest-reward-item {
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
          padding: 8px 12px;
          border-radius: 15px;
          margin: 5px;
          display: inline-block;
          font-size: 14px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  addQuestDialogListeners(dialog, onSelectQuest) {
    let selectedQuestId = null;

    // Fermeture du dialog
    const closeBtn = dialog.querySelector('.quest-dialog-close');
    const cancelBtn = dialog.querySelector('.quest-btn-cancel');
    const acceptBtn = dialog.querySelector('.quest-btn-accept');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.remove());
    }
    
    cancelBtn.addEventListener('click', () => dialog.remove());

    // Sélection des quêtes
    dialog.querySelectorAll('.quest-option').forEach(option => {
      option.addEventListener('click', () => {
        // Retirer la sélection précédente
        dialog.querySelectorAll('.quest-option').forEach(opt => 
          opt.classList.remove('selected')
        );
        
        // Sélectionner la nouvelle option
        option.classList.add('selected');
        selectedQuestId = option.dataset.questId;
        acceptBtn.disabled = false;
      });
    });

    // Accepter la quête
    acceptBtn.addEventListener('click', () => {
      if (selectedQuestId && onSelectQuest) {
        onSelectQuest(selectedQuestId);
      }
      dialog.remove();
    });

    // Fermeture avec Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  handleRegularNpcInteraction(data) {
    // Gestion des interactions NPC normales (dialogue, shop, heal)
    switch (data.type) {
      case 'dialogue':
        if (data.lines && data.lines.length > 0) {
          this.showDialogue(data.lines);
        }
        break;
        
      case 'shop':
        console.log("🛒 Ouverture boutique:", data.shopId);
        // TODO: Implémenter l'interface boutique
        break;
        
      case 'heal':
        this.showNotification(data.message, 'success');
        break;
    }
  }

  showDialogue(lines) {
    if (typeof window.showNpcDialogue === 'function') {
      window.showNpcDialogue({
        portrait: null,
        name: 'NPC',
        lines: lines
      });
    }
  }

  startQuest(questId) {
    if (this.gameRoom) {
      this.gameRoom.send("startQuest", { questId });
    }
  }

  showAvailableQuests(quests) {
    if (quests && quests.length > 0) {
      this.showQuestGiverDialog({ availableQuests: quests });
    }
  }

  handleQuestProgressUpdate(results) {
    results.forEach(result => {
      if (result.questCompleted) {
        this.showNotification(`🎉 Quête terminée !`, 'success');
        // Afficher les récompenses si disponibles
        if (result.rewards && result.rewards.length > 0) {
          setTimeout(() => {
            this.showQuestRewards({ rewards: result.rewards });
          }, 1000);
        }
      } else if (result.stepCompleted) {
        this.showNotification(`📋 Étape terminée !`, 'info');
      } else if (result.message) {
        this.showNotification(result.message, 'info');
      }
    });

    // Actualiser le journal des quêtes s'il est ouvert
    if (this.questJournal && this.questJournal.isVisible) {
      this.questJournal.refreshQuests();
    }
  }

  showQuestRewards(data) {
    if (data.rewards && data.rewards.length > 0) {
      const dialog = this.createQuestCompleteDialog(
        data.message || "Récompenses reçues !",
        data.rewards
      );
      document.body.appendChild(dialog);
    }
  }

  formatReward(reward) {
    switch (reward.type) {
      case 'gold':
        return `💰 ${reward.amount} pièces`;
      case 'item':
        return `📦 ${reward.itemId} x${reward.amount || 1}`;
      case 'pokemon':
        return `🎁 Pokémon spécial`;
      case 'experience':
        return `⭐ ${reward.amount} XP`;
      default:
        return `🎁 Récompense`;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'quest-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1001;
      animation: slideInRight 0.4s ease;
      max-width: 300px;
    `;

    // Couleurs selon le type
    switch (type) {
      case 'success':
        notification.style.background = 'rgba(40, 167, 69, 0.95)';
        break;
      case 'error':
        notification.style.background = 'rgba(220, 53, 69, 0.95)';
        break;
      default:
        notification.style.background = 'rgba(100, 149, 237, 0.95)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-suppression
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 4000);

    // Ajouter les animations si elles n'existent pas
    if (!document.querySelector('#quest-animations')) {
      const style = document.createElement('style');
      style.id = 'quest-animations';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // === MÉTHODES POUR DÉCLENCHER DES ÉVÉNEMENTS DE PROGRESSION ===

  triggerCollectEvent(itemId, amount = 1) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'collect',
        itemId: itemId,
        amount: amount
      });
    }
  }

  triggerDefeatEvent(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'defeat',
        pokemonId: pokemonId
      });
    }
  }

  triggerReachEvent(zoneId, x, y, map) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'reach',
        zoneId: zoneId,
        x: x,
        y: y,
        map: map
      });
    }
  }

  // === MÉTHODES D'INTERFACE ===

  openQuestJournal() {
    if (this.questJournal) {
      this.questJournal.show();
    }
  }

  closeQuestJournal() {
    if (this.questJournal) {
      this.questJournal.hide();
    }
  }

  toggleQuestJournal() {
    if (this.questJournal) {
      this.questJournal.toggle();
    }
  }

  // === UTILITAIRES ===

  isQuestJournalOpen() {
    return this.questJournal ? this.questJournal.isVisible : false;
  }

  getCurrentTrackedQuest() {
    return this.trackedQuest;
  }

  // Méthode à appeler depuis les scènes Phaser pour vérifier si on peut interagir
  canPlayerInteract() {
    // Vérifier si le chat est ouvert, HUD starter ouvert, dialog quest ouvert, etc.
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    return !questDialogOpen && !chatOpen && !starterHudOpen;
  }
}
