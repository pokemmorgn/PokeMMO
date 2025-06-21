// client/src/game/QuestSystem.js - VERSION CORRIGÉE SANS DOUBLONS

import { QuestJournalUI } from '../components/QuestJournalUI.js';

export class QuestSystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.questJournal = null;
    this.trackedQuest = null;
    this.questNotifications = [];

    // ✅ Utiliser le NotificationManager global
    this.notificationManager = window.NotificationManager;
    if (!this.notificationManager) {
      console.warn("⚠️ NotificationManager non trouvé, créer une instance");
      // Fallback: créer une instance si pas trouvée
      this.notificationManager = {
        show: (message, options) => console.log(`[QUEST] ${message}`),
        success: (message, options) => console.log(`[QUEST SUCCESS] ${message}`),
        error: (message, options) => console.log(`[QUEST ERROR] ${message}`),
        warning: (message, options) => console.log(`[QUEST WARNING] ${message}`),
        info: (message, options) => console.log(`[QUEST INFO] ${message}`),
        quest: (message, options) => console.log(`[QUEST] ${message}`),
        questNotification: (questName, action, options) => console.log(`[QUEST] ${questName} - ${action}`),
        achievement: (message, options) => console.log(`[ACHIEVEMENT] ${message}`)
      };
    }
    
    // ✅ NOUVEAU: Système de déduplication des notifications
    this.lastNotificationTime = new Map();
    this.notificationCooldown = 2000; // 2 secondes entre notifications similaires
    
    this.init();
  }

  init() {
    // Créer l'interface du journal
    this.questJournal = new QuestJournalUI(this.gameRoom);
    
    // Écouter les événements du serveur
    this.setupServerListeners();
    
    // Rendre le système accessible globalement
    window.questSystem = this;
    
    console.log("🎯 Système de quêtes initialisé avec NotificationManager");
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Interaction NPC avec quêtes
    this.gameRoom.onMessage("npcInteractionResult", (data) => {
      this.handleNpcInteraction(data);
      console.log("handleNpcInteraction appelé", data);
    });

    // ✅ FIX: UN SEUL HANDLER pour les résultats de quête avec déduplication
    this.gameRoom.onMessage("questStartResult", (data) => {
      console.log("🎯 Quest start result reçu:", data);
      
      if (data.success) {
        // ✅ Vérifier la déduplication avant d'afficher
        const questId = data.quest?.id || data.quest?.name || 'unknown';
        
        // Actualiser le journal
        if (this.questJournal && this.questJournal.isVisible) {
          this.questJournal.refreshQuests();
        }
      } else {
        this.notificationManager.error(
          data.message || "Impossible d'accepter la quête",
          { duration: 4000 }
        );
      }
    });

    // ✅ FIX: SUPPRIMÉ LE HANDLER questStarted pour éviter les doublons
    // Le handler questStartResult suffit amplement

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

    // Handler pour débugger
    this.gameRoom.onMessage("*", (type, data) => {
      if (type.includes("quest") || type.includes("Quest")) {
        console.log(`🔍 Message non géré reçu: ${type}`, data);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Système de déduplication intelligent
  shouldShowNotification(type, questId) {
    const key = `${type}_${questId}`;
    const now = Date.now();
    const lastTime = this.lastNotificationTime.get(key);
    
    // Si pas de notification récente ou si le cooldown est écoulé
    if (!lastTime || (now - lastTime) > this.notificationCooldown) {
      this.lastNotificationTime.set(key, now);
      return true;
    }
    
    console.log(`🔕 Notification dédupliquée: ${key} (${now - lastTime}ms depuis la dernière)`);
    return false;
  }

  handleNpcInteraction(data) {
    console.log("🎯 Interaction NPC reçue:", data);
    
    // Vérifier si un dialog est déjà ouvert
    if (window._questDialogActive) {
      console.log("⚠️ Dialog de quête déjà ouvert, interaction ignorée");
      return;
    }
    
    // Ne traiter QUE les interactions liées aux quêtes
    switch (data.type) {
      case 'questGiver':
        const parsedData = this.parseNpcQuestData(data);
        this.showQuestGiverDialog(parsedData);
        break;
        
      case 'questComplete':
        this.showQuestCompleteDialog(data);
        break;
        
      case 'questProgress':
        // ✅ Déduplication pour les messages de progression aussi
        if (this.shouldShowNotification('questProgress', data.message)) {
          this.notificationManager.info(data.message, { duration: 3000 });
        }
        break;
        
      case 'shop':
        console.log("🛒 Ouverture boutique:", data.shopId);
        break;
        
      case 'heal':
        this.notificationManager.success(data.message, { duration: 3000 });
        break;
        
      default:
        console.log(`ℹ️ Type d'interaction '${data.type}' délégué à BaseZoneScene`);
        break;
    }
  }

  // ✅ Parsing des données NPC (inchangé)
  parseNpcQuestData(data) {
    console.log("🔍 Parsing NPC quest data:", data);
    
    try {
      let availableQuests = data.availableQuests || [];
      
      if (typeof availableQuests === 'string') {
        console.log("📝 Parsing string JSON:", availableQuests);
        availableQuests = JSON.parse(availableQuests);
      }
      
      if (!Array.isArray(availableQuests)) {
        console.warn("⚠️ availableQuests n'est pas un array:", typeof availableQuests);
        
        if (availableQuests.quests && Array.isArray(availableQuests.quests)) {
          availableQuests = availableQuests.quests;
        } else {
          availableQuests = [];
        }
      }

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

  addQuestDialogListeners(dialog, onSelectQuest, defaultSelectedId = null) {
    let selectedQuestId = defaultSelectedId;

    const closeBtn = dialog.querySelector('.quest-dialog-close');
    const cancelBtn = dialog.querySelector('.quest-btn-cancel');
    const acceptBtn = dialog.querySelector('.quest-btn-accept');

    if (defaultSelectedId && acceptBtn) {
      acceptBtn.disabled = false;
    }

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

    // Gestion clavier
    const handleKeydown = (e) => {
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
          
          if (selectedQuestId || defaultSelectedId) {
            console.log(`✅ Acceptation via ${e.key}: ${selectedQuestId || defaultSelectedId}`);
            acceptQuest();
          } else {
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

    document.addEventListener('keydown', handleKeydown);
    dialog.tabIndex = -1;
    dialog.focus();

    console.log(`📋 Event listeners configurés pour dialogue quête (selectedId: ${selectedQuestId})`);
  }

  navigateQuestOptions(dialog, direction) {
    const options = dialog.querySelectorAll('.quest-option');
    if (options.length === 0) return;

    let currentIndex = -1;
    options.forEach((option, index) => {
      if (option.classList.contains('selected')) {
        currentIndex = index;
      }
    });

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;

    options[newIndex].click();
  }

  startQuest(questId) {
    console.log("🎯 Démarrage de la quête:", questId);
    
    if (this.gameRoom) {
      this.gameRoom.send("startQuest", { questId });
      console.log("📤 Message startQuest envoyé au serveur");
    } else {
      console.error("❌ Pas de gameRoom pour envoyer startQuest");
    }
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

  // === MÉTHODES AVEC NOTIFICATIONMANAGER ET DÉDUPLICATION ===
  
  showAvailableQuests(quests) {
    if (quests && quests.length > 0) {
      // ✅ Déduplication pour les quêtes disponibles
      if (this.shouldShowNotification('availableQuests', quests.length)) {
        this.notificationManager.info(
          `${quests.length} quête(s) disponible(s)`,
          {
            duration: 3000,
            position: 'bottom-right'
          }
        );
      }
      
      this.showQuestGiverDialog({ availableQuests: quests });
    }
  }

  handleQuestProgressUpdate(results) {
    if (!Array.isArray(results)) return;
    
    results.forEach(result => {
      if (result.questCompleted) {
        // ✅ Déduplication pour les quêtes terminées
        const questId = result.questId || 'unknown';
        if (this.shouldShowNotification('questCompleted', questId)) {
          this.notificationManager.questNotification(
            result.questId,
            'completed',
            {
              duration: 6000,
              bounce: true,
              sound: true,
              onClick: () => this.openQuestJournal()
            }
          );
          
          // Afficher les récompenses si disponibles
          if (result.rewards && result.rewards.length > 0) {
            setTimeout(() => {
              this.showQuestRewards({ rewards: result.rewards });
            }, 1000);
          }
        }
      } else if (result.stepCompleted) {
        // ✅ Déduplication pour les étapes terminées
        const stepId = `${result.questId || 'unknown'}_step`;
        if (this.shouldShowNotification('stepCompleted', stepId)) {
          this.notificationManager.quest(
            `Étape terminée !`,
            {
              duration: 3000,
              onClick: () => this.openQuestJournal()
            }
          );
        }
      } else if (result.message) {
        // ✅ Déduplication pour les messages de progression
        if (this.shouldShowNotification('questProgress', result.message)) {
          this.notificationManager.info(result.message, { duration: 3000 });
        }
      }
    });
    
    // Actualiser la liste
    if (this.questJournal && this.questJournal.isVisible) {
      this.questJournal.refreshQuests();
    }
  }

  showQuestRewards(data) {
    if (data.rewards && data.rewards.length > 0) {
      window._questDialogActive = true;
      
      const rewardText = data.rewards.map(r => this.formatReward(r)).join(', ');
      
      // ✅ Déduplication pour les récompenses
      if (this.shouldShowNotification('questRewards', rewardText)) {
        this.notificationManager.achievement(
          `Récompenses reçues : ${rewardText}`,
          {
            duration: 8000,
            persistent: false,
            bounce: true,
            sound: true
          }
        );
      }
      
      // Créer aussi le dialogue traditionnel
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

  // === NOUVELLES MÉTHODES POUR DIFFÉRENTS TYPES DE NOTIFICATIONS AVEC DÉDUPLICATION ===
  
  notifyQuestObjectiveProgress(questName, objectiveName, current, required) {
    const progressKey = `${questName}_${objectiveName}_${current}_${required}`;
    if (this.shouldShowNotification('questObjective', progressKey)) {
      const message = `${questName}: ${objectiveName} (${current}/${required})`;
      this.notificationManager.quest(message, {
        duration: 2500,
        position: 'bottom-center'
      });
    }
  }

  notifyQuestStepCompleted(questName, stepName) {
    const stepKey = `${questName}_${stepName}`;
    if (this.shouldShowNotification('stepCompleted', stepKey)) {
      this.notificationManager.success(
        `${questName}: ${stepName} terminée !`,
        {
          duration: 4000,
          bounce: true
        }
      );
    }
  }

  notifyQuestFailed(questName, reason) {
    const failKey = questName;
    if (this.shouldShowNotification('questFailed', failKey)) {
      this.notificationManager.questNotification(
        questName,
        'failed',
        {
          duration: 5000,
          onClick: () => this.openQuestJournal()
        }
      );
      
      if (reason) {
        setTimeout(() => {
          this.notificationManager.warning(reason, { duration: 4000 });
        }, 500);
      }
    }
  }

  notifyQuestTimeLimit(questName, timeRemaining) {
    const timeKey = `${questName}_${timeRemaining}`;
    if (this.shouldShowNotification('questTimeLimit', timeKey)) {
      this.notificationManager.warning(
        `${questName}: ${timeRemaining} restant !`,
        {
          duration: 3000,
          position: 'top-center'
        }
      );
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
      
      // ✅ Notification immédiate de collecte (avec déduplication)
      const collectKey = `${itemId}_${amount}`;
      if (this.shouldShowNotification('itemCollect', collectKey)) {
        this.notificationManager.info(
          `Objet collecté: ${itemId} x${amount}`,
          {
            duration: 2000,
            position: 'bottom-right',
            type: 'inventory'
          }
        );
      }
    }
  }

  triggerDefeatEvent(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'defeat',
        pokemonId: pokemonId
      });
      
      // ✅ Notification de combat (avec déduplication)
      if (this.shouldShowNotification('pokemonDefeat', pokemonId)) {
        this.notificationManager.show(
          `Pokémon vaincu !`,
          {
            type: 'battle',
            duration: 2000,
            position: 'bottom-center'
          }
        );
      }
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
      
      // ✅ Notification de zone (avec déduplication)
      if (this.shouldShowNotification('zoneReach', zoneId)) {
        this.notificationManager.info(
          `Zone visitée: ${zoneId}`,
          {
            duration: 2000,
            position: 'top-center'
          }
        );
      }
    }
  }

  triggerDeliverEvent(npcId, itemId) {
    if (this.gameRoom) {
      this.gameRoom.send("questProgress", {
        type: 'deliver',
        npcId: npcId,
        targetId: itemId
      });
      
      // ✅ Notification de livraison (avec déduplication)
      const deliverKey = `${npcId}_${itemId}`;
      if (this.shouldShowNotification('itemDeliver', deliverKey)) {
        this.notificationManager.success(
          `Objet livré: ${itemId}`,
          {
            duration: 3000
          }
        );
      }
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

  // === MÉTHODES DE DEBUG POUR LA DÉDUPLICATION ===

  /**
   * Réinitialise le système de déduplication
   */
  resetNotificationCooldowns() {
    this.lastNotificationTime.clear();
    console.log("🔄 Cooldowns de notification réinitialisés");
  }

  /**
   * Affiche l'état actuel du système de déduplication
   */
  debugNotificationSystem() {
    console.log("🔍 État du système de déduplication des notifications:");
    console.log("- Cooldown actuel:", this.notificationCooldown, "ms");
    console.log("- Notifications en cooldown:", this.lastNotificationTime.size);
    
    if (this.lastNotificationTime.size > 0) {
      console.log("- Détails des cooldowns:");
      const now = Date.now();
      this.lastNotificationTime.forEach((time, key) => {
        const remaining = Math.max(0, this.notificationCooldown - (now - time));
        console.log(`  ${key}: ${remaining}ms restant`);
      });
    }

    // ✅ Notification de debug
    if (this.notificationManager) {
      this.notificationManager.info(
        `Debug: ${this.lastNotificationTime.size} notifications en cooldown`,
        {
          duration: 3000,
          position: 'top-left'
        }
      );
    }
  }

  /**
   * Configure le délai de déduplication
   */
  setNotificationCooldown(milliseconds) {
    const oldCooldown = this.notificationCooldown;
    this.notificationCooldown = milliseconds;
    
    console.log(`🔧 Cooldown notification changé: ${oldCooldown}ms → ${milliseconds}ms`);
    
    if (this.notificationManager) {
      this.notificationManager.info(
        `Cooldown mis à jour: ${milliseconds}ms`,
        {
          duration: 2000,
          position: 'bottom-left'
        }
      );
    }
  }
}
