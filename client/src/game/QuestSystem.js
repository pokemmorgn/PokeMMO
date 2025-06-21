// client/src/game/QuestSystem.js - VERSION CORRIGÉE

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
      console.log("handleNpcInteraction appelé", data);
    });

    // ✅ FIX 1: Correction du handler pour questStartResult
    this.gameRoom.onMessage("questStartResult", (data) => {
      console.log("🎯 Quest start result reçu:", data);
      if (data.success) {
        this.showNotification(`Quête acceptée : ${data.quest?.name || 'Nouvelle quête'}`, 'success');
        // ✅ Actualiser immédiatement le journal
        if (this.questJournal && this.questJournal.isVisible) {
          this.questJournal.refreshQuests();
        }
      } else {
        this.showNotification(data.message || "Impossible d'accepter la quête", 'error');
      }
    });

    // ✅ FIX 2: Ajouter un handler pour questStarted (au cas où le serveur envoie ce message)
    this.gameRoom.onMessage("questStarted", (data) => {
      console.log("🎯 Quest started reçu:", data);
      this.showNotification(`Nouvelle quête : ${data.quest?.name || 'Quête démarrée'}`, 'success');
      if (this.questJournal && this.questJournal.isVisible) {
        this.questJournal.refreshQuests();
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

    // ✅ FIX 3: Ajouter des handlers pour débugger
    this.gameRoom.onMessage("*", (type, data) => {
      if (type.includes("quest") || type.includes("Quest")) {
        console.log(`🔍 Message non géré reçu: ${type}`, data);
      }
    });
  }

  handleNpcInteraction(data) {
    console.log("🎯 Interaction NPC reçue:", data);
    
    // ✅ Vérifier si un dialog est déjà ouvert
    if (window._questDialogActive) {
      console.log("⚠️ Dialog de quête déjà ouvert, interaction ignorée");
      return;
    }
    
    // ✅ NOUVEAU: Ne traiter QUE les interactions liées aux quêtes
    switch (data.type) {
      case 'questGiver':
        // ✅ FIX 4: Parser les données de quêtes disponibles
        const parsedData = this.parseNpcQuestData(data);
        this.showQuestGiverDialog(parsedData);
        break;
        
      case 'questComplete':
        this.showQuestCompleteDialog(data);
        break;
        
      case 'questProgress':
        this.showNotification(data.message, 'info');
        break;
        
      case 'shop':
        console.log("🛒 Ouverture boutique:", data.shopId);
        break;
        
      case 'heal':
        this.showNotification(data.message, 'success');
        break;
        
      default:
        console.log(`ℹ️ Type d'interaction '${data.type}' délégué à BaseZoneScene`);
        break;
    }
  }

  // ✅ FIX 5: Amélioration du parsing des données NPC
  parseNpcQuestData(data) {
    console.log("🔍 Parsing NPC quest data:", data);
    
    try {
      let availableQuests = data.availableQuests || [];
      
      // Si availableQuests est une string JSON, la parser
      if (typeof availableQuests === 'string') {
        console.log("📝 Parsing string JSON:", availableQuests);
        availableQuests = JSON.parse(availableQuests);
      }
      
      // Si ce n'est toujours pas un array, essayer de l'extraire
      if (!Array.isArray(availableQuests)) {
        console.warn("⚠️ availableQuests n'est pas un array:", typeof availableQuests);
        
        if (availableQuests.quests && Array.isArray(availableQuests.quests)) {
          availableQuests = availableQuests.quests;
        } else {
          availableQuests = [];
        }
      }

      // Normaliser chaque quête
      const normalizedQuests = availableQuests.map(quest => this.normalizeQuestData(quest));
      
      console.log("✅ Quêtes NPC parsées:", normalizedQuests);
      
      return {
        ...data,
        availableQuests: normalizedQuests
      };
      
    } catch (error) {
      console.error("❌ Erreur lors du parsing des quêtes NPC:", error);
      return {
        ...data,
        availableQuests: []
      };
    }
  }

  normalizeQuestData(quest) {
    try {
      if (typeof quest === 'string') {
        quest = JSON.parse(quest);
      }

      const normalized = {
        id: quest.id || `quest_${Date.now()}`,
        name: quest.name || 'Quête sans nom',
        description: quest.description || 'Pas de description disponible',
        category: quest.category || 'side',
        steps: []
      };

      if (quest.steps && Array.isArray(quest.steps)) {
        normalized.steps = quest.steps.map((step, index) => {
          try {
            if (typeof step === 'string') {
              step = JSON.parse(step);
            }
            
            return {
              id: step.id || `step_${index}`,
              name: step.name || `Étape ${index + 1}`,
              description: step.description || 'Pas de description',
              rewards: step.rewards || []
            };
          } catch (err) {
            console.warn("⚠️ Erreur step:", err);
            return {
              id: `step_${index}`,
              name: `Étape ${index + 1}`,
              description: 'Description non disponible',
              rewards: []
            };
          }
        });
      }

      return normalized;

    } catch (error) {
      console.error("❌ Erreur normalizeQuestData:", error, quest);
      return {
        id: 'error_quest',
        name: 'Quête (Erreur)',
        description: 'Cette quête n\'a pas pu être chargée correctement.',
        category: 'error',
        steps: []
      };
    }
  }

  showQuestGiverDialog(data) {
    console.log("💬 Affichage dialogue quête:", data);
    
    if (!data.availableQuests || data.availableQuests.length === 0) {
      console.log("⚠️ Aucune quête disponible");
      return;
    }

    // ✅ FIX 6: Marquer le dialog comme actif
    window._questDialogActive = true;

    const questDialog = this.createQuestDialog('Quêtes disponibles', data.availableQuests, (questId) => {
      this.startQuest(questId);
    });

    document.body.appendChild(questDialog);
  }

  showQuestCompleteDialog(data) {
    const message = data.message || "Félicitations ! Vous avez terminé une quête !";
    
    window._questDialogActive = true;
    const completeDialog = this.createQuestCompleteDialog(message, data.questRewards);
    document.body.appendChild(completeDialog);
  }

  createQuestDialog(title, quests, onSelectQuest) {
    console.log("🎨 Création dialogue avec quêtes:", quests);
    
    const dialog = document.createElement('div');
    dialog.className = 'quest-dialog-overlay';
    
    const questsHTML = quests.map(quest => {
      const questName = quest.name || 'Quête sans nom';
      const questDesc = quest.description || 'Pas de description';
      const questCategory = quest.category || 'side';
      const firstStep = quest.steps && quest.steps[0] ? quest.steps[0] : null;
      
      console.log("🎯 Génération HTML pour quête:", questName);
      
      return `
        <div class="quest-option" data-quest-id="${quest.id}">
          <div class="quest-option-header">
            <strong>${questName}</strong>
            <span class="quest-category ${questCategory}">${questCategory.toUpperCase()}</span>
          </div>
          <p class="quest-option-description">${questDesc}</p>
          ${firstStep ? `
            <div class="quest-option-steps">
              <strong>Première étape :</strong> ${firstStep.description || 'Non spécifiée'}
            </div>
            ${firstStep.rewards && firstStep.rewards.length > 0 ? `
              <div class="quest-option-rewards">
                <strong>Récompenses :</strong> 
                ${firstStep.rewards.map(r => this.formatReward(r)).join(', ')}
              </div>
            ` : ''}
          ` : `
            <div class="quest-option-steps">
              <strong>Première étape :</strong> Information non disponible
            </div>
          `}
        </div>
      `;
    }).join('');

    dialog.innerHTML = `
      <div class="quest-dialog">
        <div class="quest-dialog-header">
          <h3>${title}</h3>
          <button class="quest-dialog-close">✕</button>
        </div>
        <div class="quest-dialog-content">
          ${questsHTML}
        </div>
        <div class="quest-dialog-actions">
          <button class="quest-btn-cancel">Annuler</button>
          <button class="quest-btn-accept" disabled>Accepter</button>
        </div>
      </div>
    `;

    // Sélection automatique si une seule quête
    let defaultSelectedId = null;
    if (quests.length === 1) {
      const onlyOption = dialog.querySelector('.quest-option');
      const acceptBtn = dialog.querySelector('.quest-btn-accept');
      if (onlyOption && acceptBtn) {
        onlyOption.classList.add('selected');
        acceptBtn.disabled = false;
        defaultSelectedId = onlyOption.dataset.questId;
        setTimeout(() => {
          onlyOption.focus();
          acceptBtn.focus();
        }, 0);
      }
    }

    this.styleQuestDialog(dialog);
    this.addQuestDialogListeners(dialog, onSelectQuest, defaultSelectedId);

    return dialog;
  }

  // ✅ FIX 7: Correction des event listeners du dialog
addQuestDialogListeners(dialog, onSelectQuest, defaultSelectedId = null) {
  let selectedQuestId = defaultSelectedId;

  const closeBtn = dialog.querySelector('.quest-dialog-close');
  const cancelBtn = dialog.querySelector('.quest-btn-cancel');
  const acceptBtn = dialog.querySelector('.quest-btn-accept');

  if (defaultSelectedId && acceptBtn) {
    acceptBtn.disabled = false;
  }

  // ✅ FIX: Correction des handlers de fermeture
  const closeDialog = () => {
    dialog.remove();
    window._questDialogActive = false;
    console.log("📋 Dialogue de quête fermé");
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', closeDialog);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeDialog);
  }

  // Sélection des quêtes
  dialog.querySelectorAll('.quest-option').forEach(option => {
    option.addEventListener('click', () => {
      dialog.querySelectorAll('.quest-option').forEach(opt => 
        opt.classList.remove('selected')
      );
      option.classList.add('selected');
      selectedQuestId = option.dataset.questId;
      acceptBtn.disabled = false;
      
      console.log(`📋 Quête sélectionnée: ${selectedQuestId}`);
    });
  });

  // ✅ CORRECTION: Handler d'acceptation
  const acceptQuest = () => {
    if (!selectedQuestId && defaultSelectedId) {
      selectedQuestId = defaultSelectedId;
    }
    if (!selectedQuestId) {
      const selectedOption = dialog.querySelector('.quest-option.selected') || dialog.querySelector('.quest-option');
      if (selectedOption) {
        selectedQuestId = selectedOption.dataset.questId;
      }
    }
    
    console.log("🎯 Acceptation de la quête:", selectedQuestId);
    
    if (selectedQuestId && onSelectQuest) {
      onSelectQuest(selectedQuestId);
    }
    closeDialog();
  };

  acceptBtn.addEventListener('click', acceptQuest);

  // ✅ NOUVEAU: Gestion clavier pour le dialogue de quête
  const handleKeydown = (e) => {
    // ✅ VÉRIFIER QUE LE DIALOGUE EST TOUJOURS OUVERT
    if (!dialog || !dialog.parentNode) {
      document.removeEventListener('keydown', handleKeydown);
      return;
    }

    console.log(`⌨️ Touche pressée dans dialogue quête: ${e.key}`);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
        break;
        
      case 'Enter':
      case 'e':
      case 'E':
        e.preventDefault();
        e.stopPropagation();
        
        // Vérifier si une quête est sélectionnée ou s'il y en a qu'une seule
        if (selectedQuestId || defaultSelectedId) {
          console.log(`✅ Acceptation via ${e.key}: ${selectedQuestId || defaultSelectedId}`);
          acceptQuest();
        } else {
          // Sélectionner la première quête disponible
          const firstOption = dialog.querySelector('.quest-option');
          if (firstOption) {
            firstOption.click();
          }
        }
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        this.navigateQuestOptions(dialog, e.key === 'ArrowDown' ? 1 : -1);
        break;
    }
  };

  // ✅ AJOUTER LE LISTENER KEYBOARD
  document.addEventListener('keydown', handleKeydown);
  
  // ✅ FOCUS AUTOMATIQUE sur le dialogue pour capturer les touches
  dialog.tabIndex = -1;
  dialog.focus();

  console.log(`📋 Event listeners configurés pour dialogue quête (selectedId: ${selectedQuestId})`);
}
  // ✅ FIX 10: Amélioration de startQuest
  startQuest(questId) {
    console.log("🎯 Démarrage de la quête:", questId);
    
    if (this.gameRoom) {
      // ✅ Utiliser le bon nom de message
      this.gameRoom.send("startQuest", { questId });
      console.log("📤 Message startQuest envoyé au serveur");
    } else {
      console.error("❌ Pas de gameRoom pour envoyer startQuest");
    }
  }

  // ✅ FIX 11: Amélioration des notifications
  showNotification(message, type = 'info') {
    console.log(`📢 Notification: ${message} (${type})`);
    
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

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 4000);

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

  // Reste des méthodes inchangées...
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
      `;
      document.head.appendChild(style);
    }
  }

  formatReward(reward) {
    try {
      if (typeof reward === 'string') {
        reward = JSON.parse(reward);
      }
      
      const type = reward.type || 'unknown';
      const amount = reward.amount || 1;
      
      switch (type) {
        case 'gold':
          return `💰 ${amount} pièces`;
        case 'item':
          const itemId = reward.itemId || reward.item || 'Objet inconnu';
          return `📦 ${itemId} x${amount}`;
        case 'pokemon':
          return `🎁 Pokémon spécial`;
        case 'experience':
          return `⭐ ${amount} XP`;
        default:
          return `🎁 Récompense (${type})`;
      }
    } catch (error) {
      console.warn("⚠️ Erreur formatReward:", error, reward);
      return `🎁 Récompense`;
    }
  }

  // Méthodes restantes inchangées...
  showAvailableQuests(quests) {
    if (quests && quests.length > 0) {
      this.showQuestGiverDialog({ availableQuests: quests });
    }
  }

  handleQuestProgressUpdate(results) {
    results.forEach(result => {
      if (result.questCompleted) {
        this.showNotification(`🎉 Quête terminée !`, 'success');
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

    if (this.questJournal && this.questJournal.isVisible) {
      this.questJournal.refreshQuests();
    }
  }

  showQuestRewards(data) {
    if (data.rewards && data.rewards.length > 0) {
      window._questDialogActive = true;
      const dialog = this.createQuestCompleteDialog(
        data.message || "Récompenses reçues !",
        data.rewards
      );
      document.body.appendChild(dialog);
    }
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
    
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.remove();
        window._questDialogActive = false;
      }
    }, 5000);

    dialog.querySelector('.quest-btn-accept').addEventListener('click', () => {
      dialog.remove();
      window._questDialogActive = false;
    });
    
    return dialog;
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

  triggerDeliverEvent(npcId, itemId) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'deliver',
        npcId: npcId,
        targetId: itemId
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

  isQuestJournalOpen() {
    return this.questJournal ? this.questJournal.isVisible : false;
  }

  getCurrentTrackedQuest() {
    return this.trackedQuest;
  }

  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    
    return !questDialogOpen && !chatOpen && !starterHudOpen;
  }
}
