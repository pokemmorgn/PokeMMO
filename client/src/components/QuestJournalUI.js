// client/src/components/QuestJournalUI.js - VERSION CORRIGÉE

export class QuestJournalUI {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.isVisible = false;
    this.activeQuests = [];
    this.currentQuestIndex = 0;
    
    this.createUI();
    this.setupEventListeners();
    this.setupRoomListeners();
  }

  createUI() {
    this.questJournal = document.createElement('div');
    this.questJournal.id = 'quest-journal';
    this.questJournal.innerHTML = `
      <div class="quest-journal-header">
        <h2>📖 Journal des Quêtes</h2>
        <button class="quest-close-btn" id="close-quest-journal">✕</button>
      </div>
      
      <div class="quest-tabs">
        <button class="quest-tab active" data-tab="active">Actives</button>
        <button class="quest-tab" data-tab="completed">Terminées</button>
        <button class="quest-tab" data-tab="available">Disponibles</button>
      </div>
      
      <div class="quest-content">
        <div class="quest-list" id="active-quest-list">
          <div class="quest-empty">Aucune quête active</div>
        </div>
        
        <div class="quest-details" id="quest-details">
          <div class="quest-empty">Sélectionnez une quête pour voir les détails</div>
        </div>
      </div>
      
      <div class="quest-actions">
        <button id="refresh-quests" class="quest-btn">🔄 Actualiser</button>
        <button id="track-quest" class="quest-btn" disabled>📍 Suivre</button>
      </div>
    `;

    this.questJournal.style.cssText = `
      position: fixed;
      top: 10%;
      right: -450px;
      width: 400px;
      height: 70%;
      background: linear-gradient(145deg, rgba(25, 35, 55, 0.98), rgba(35, 45, 65, 0.98));
      border: 2px solid rgba(100, 149, 237, 0.8);
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      z-index: 1000;
      font-family: 'Arial', sans-serif;
      color: #fff;
      transition: right 0.4s ease;
      display: flex;
      flex-direction: column;
    `;

    document.body.appendChild(this.questJournal);
    this.applyDetailedStyles();
  }

  applyDetailedStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .quest-journal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: rgba(100, 149, 237, 0.2);
        border-bottom: 1px solid rgba(100, 149, 237, 0.3);
        border-radius: 13px 13px 0 0;
      }

      .quest-journal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      .quest-close-btn {
        background: rgba(220, 53, 69, 0.8);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
      }

      .quest-close-btn:hover {
        background: rgba(220, 53, 69, 1);
        transform: scale(1.1);
      }

      .quest-tabs {
        display: flex;
        border-bottom: 1px solid rgba(100, 149, 237, 0.3);
      }

      .quest-tab {
        flex: 1;
        padding: 12px;
        background: rgba(25, 35, 55, 0.5);
        border: none;
        color: #ccc;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      }

      .quest-tab.active {
        background: rgba(100, 149, 237, 0.3);
        color: #fff;
        font-weight: bold;
      }

      .quest-tab:hover:not(.active) {
        background: rgba(100, 149, 237, 0.1);
      }

      .quest-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .quest-list {
        width: 50%;
        border-right: 1px solid rgba(100, 149, 237, 0.3);
        overflow-y: auto;
        padding: 10px;
      }

      .quest-details {
        width: 50%;
        padding: 15px;
        overflow-y: auto;
      }

      .quest-item {
        padding: 12px;
        margin-bottom: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-left: 4px solid transparent;
      }

      .quest-item:hover {
        background: rgba(100, 149, 237, 0.15);
        transform: translateX(3px);
      }

      .quest-item.selected {
        background: rgba(100, 149, 237, 0.25);
        border-left-color: #64b5f6;
      }

      .quest-item-title {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 4px;
        color: #fff;
      }

      .quest-item-progress {
        font-size: 12px;
        color: #ccc;
      }

      .quest-item-category {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        margin-top: 4px;
      }

      .quest-item-category.main {
        background: rgba(255, 193, 7, 0.3);
        color: #ffc107;
      }

      .quest-item-category.side {
        background: rgba(40, 167, 69, 0.3);
        color: #28a745;
      }

      .quest-item-category.daily {
        background: rgba(220, 53, 69, 0.3);
        color: #dc3545;
      }

      .quest-details-content {
        animation: fadeIn 0.3s ease;
      }

      .quest-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #64b5f6;
      }

      .quest-description {
        font-size: 13px;
        color: #ccc;
        margin-bottom: 15px;
        line-height: 1.4;
      }

      .quest-step {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
      }

      .quest-step.completed {
        background: rgba(40, 167, 69, 0.2);
        border-left: 3px solid #28a745;
      }

      .quest-step.current {
        background: rgba(255, 193, 7, 0.2);
        border-left: 3px solid #ffc107;
      }

      .quest-step-title {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 5px;
      }

      .quest-objective {
        font-size: 12px;
        margin: 5px 0;
        padding-left: 15px;
        position: relative;
      }

      .quest-objective:before {
        content: "•";
        position: absolute;
        left: 0;
        color: #64b5f6;
      }

      .quest-objective.completed {
        color: #28a745;
        text-decoration: line-through;
      }

      .quest-objective.completed:before {
        content: "✓";
        color: #28a745;
      }

      .quest-progress-bar {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        height: 6px;
        margin: 5px 0;
        overflow: hidden;
      }

      .quest-progress-fill {
        background: linear-gradient(90deg, #64b5f6, #42a5f5);
        height: 100%;
        transition: width 0.3s ease;
      }

      .quest-rewards {
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid rgba(100, 149, 237, 0.3);
      }

      .quest-reward {
        display: inline-block;
        background: rgba(255, 193, 7, 0.2);
        color: #ffc107;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        margin: 2px;
      }

      .quest-actions {
        padding: 15px 20px;
        border-top: 1px solid rgba(100, 149, 237, 0.3);
        display: flex;
        gap: 10px;
      }

      .quest-btn {
        flex: 1;
        padding: 10px;
        background: rgba(100, 149, 237, 0.3);
        border: 1px solid rgba(100, 149, 237, 0.5);
        color: #fff;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
      }

      .quest-btn:hover:not(:disabled) {
        background: rgba(100, 149, 237, 0.5);
        transform: translateY(-1px);
      }

      .quest-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .quest-empty {
        text-align: center;
        color: #888;
        font-style: italic;
        padding: 20px;
      }

      .quest-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(40, 167, 69, 0.95);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1001;
        animation: slideInRight 0.4s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      .quest-list::-webkit-scrollbar,
      .quest-details::-webkit-scrollbar {
        width: 6px;
      }

      .quest-list::-webkit-scrollbar-track,
      .quest-details::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }

      .quest-list::-webkit-scrollbar-thumb,
      .quest-details::-webkit-scrollbar-thumb {
        background: rgba(100, 149, 237, 0.5);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    this.questJournal.querySelector('#close-quest-journal').addEventListener('click', () => {
      this.hide();
    });

    this.questJournal.querySelectorAll('.quest-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    this.questJournal.querySelector('#refresh-quests').addEventListener('click', () => {
      this.refreshQuests();
    });

    this.questJournal.querySelector('#track-quest').addEventListener('click', () => {
      this.trackSelectedQuest();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'q' || e.key === 'Q') {
        if (typeof window.isChatFocused === 'function' && !window.isChatFocused()) {
          this.toggle();
        }
      }
    });
  }

  setupRoomListeners() {
    if (!this.gameRoom) return;

    // ✅ FIX 1: Correction des listeners pour les quêtes actives
    this.gameRoom.onMessage("activeQuestsList", (data) => {
      console.log("📋 Liste des quêtes actives reçue:", data);
      this.activeQuests = data.quests || [];
      this.updateQuestList();
    });

    // ✅ FIX 2: Écouter les mises à jour de quête
    this.gameRoom.onMessage("questProgressUpdate", (results) => {
      console.log("📈 Progression de quête mise à jour:", results);
      this.handleQuestProgress(results);
    });

    // ✅ FIX 3: Écouter les nouvelles quêtes
    this.gameRoom.onMessage("questStarted", (data) => {
      console.log("🆕 Nouvelle quête démarrée:", data);
      this.showNotification(`Nouvelle quête : ${data.quest.name}`, 'success');
      this.refreshQuests();
    });

    // ✅ FIX 4: Écouter les résultats de démarrage de quête
    this.gameRoom.onMessage("questStartResult", (data) => {
      console.log("🎯 Résultat de démarrage de quête:", data);
      if (data.success) {
   //     this.showNotification(`Quête acceptée : ${data.quest?.name || 'Nouvelle quête'}`, 'success');
        this.refreshQuests();
      }
    });

    this.gameRoom.onMessage("questRewards", (data) => {
      this.showQuestRewards(data);
    });
  }

  show() {
    this.isVisible = true;
    this.questJournal.style.right = '20px';
    this.refreshQuests();
    console.log("📖 Journal des quêtes ouvert");
  }

  hide() {
    this.isVisible = false;
    this.questJournal.style.right = '-450px';
    console.log("📖 Journal des quêtes fermé");
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  switchTab(tabName) {
    this.questJournal.querySelectorAll('.quest-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    this.questJournal.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    switch (tabName) {
      case 'active':
        this.loadActiveQuests();
        break;
      case 'completed':
        this.loadCompletedQuests();
        break;
      case 'available':
        this.loadAvailableQuests();
        break;
    }
  }

  // ✅ FIX 5: Amélioration du chargement des quêtes actives
  loadActiveQuests() {
    console.log("📋 Chargement des quêtes actives...");
    if (this.gameRoom) {
      this.gameRoom.send("getActiveQuests");
    } else {
      console.warn("⚠️ Pas de gameRoom pour charger les quêtes actives");
    }
  }

  loadCompletedQuests() {
    console.log("📋 Chargement des quêtes terminées...");
    // TODO: Implémenter la récupération des quêtes complétées
    this.updateQuestList([]);
  }

  loadAvailableQuests() {
    console.log("📋 Chargement des quêtes disponibles...");
    if (this.gameRoom) {
      this.gameRoom.send("getAvailableQuests");
    }
  }

  // ✅ FIX 6: Amélioration de la mise à jour de la liste des quêtes
  updateQuestList(quests = this.activeQuests) {
    console.log("📝 Mise à jour de la liste des quêtes:", quests);
    
    const questList = this.questJournal.querySelector('.quest-list');
    
    if (!quests || quests.length === 0) {
      questList.innerHTML = '<div class="quest-empty">Aucune quête trouvée</div>';
      this.updateQuestDetails(null);
      return;
    }

    questList.innerHTML = quests.map((quest, index) => {
      const progress = this.calculateQuestProgress(quest);
      const categoryClass = quest.category || 'side';
      
      return `
        <div class="quest-item" data-quest-index="${index}">
          <div class="quest-item-title">${quest.name || 'Quête sans nom'}</div>
          <div class="quest-item-progress">${progress.completed}/${progress.total} objectifs</div>
          <div class="quest-item-category ${categoryClass}">${(quest.category || 'side').toUpperCase()}</div>
        </div>
      `;
    }).join('');

    // Ajouter les event listeners
    questList.querySelectorAll('.quest-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectQuest(index);
      });
    });

    // Sélectionner la première quête
    if (quests.length > 0) {
      this.selectQuest(0);
    }
  }

  selectQuest(index) {
    this.questJournal.querySelectorAll('.quest-item').forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });

    this.currentQuestIndex = index;
    const quest = this.activeQuests[index];
    if (quest) {
      this.updateQuestDetails(quest);
      this.questJournal.querySelector('#track-quest').disabled = false;
    }
  }

  updateQuestDetails(quest) {
    const detailsContainer = this.questJournal.querySelector('#quest-details');
    
    if (!quest) {
      detailsContainer.innerHTML = '<div class="quest-empty">Sélectionnez une quête pour voir les détails</div>';
      return;
    }

    console.log("📄 Mise à jour des détails de la quête:", quest);

    const isCompleted = quest.currentStepIndex >= quest.steps.length;

    detailsContainer.innerHTML = `
      <div class="quest-details-content">
        <div class="quest-title">${quest.name || 'Quête sans nom'}</div>
        <div class="quest-description">${quest.description || 'Pas de description'}</div>
        
        ${quest.steps.map((step, index) => {
          const isCurrent = index === quest.currentStepIndex;
          const isStepCompleted = index < quest.currentStepIndex;
          const stepClass = isStepCompleted ? 'completed' : (isCurrent ? 'current' : '');
          
          return `
            <div class="quest-step ${stepClass}">
              <div class="quest-step-title">${step.name || `Étape ${index + 1}`}</div>
              <div class="quest-step-description">${step.description || ''}</div>
              
              ${step.objectives ? step.objectives.map(obj => {
                const progress = Math.min(obj.currentAmount || 0, obj.requiredAmount || 1);
                const percentage = ((progress / (obj.requiredAmount || 1)) * 100);
                
                return `
                  <div class="quest-objective ${obj.completed ? 'completed' : ''}">
                    ${obj.description || 'Objectif'} (${progress}/${obj.requiredAmount || 1})
                    <div class="quest-progress-bar">
                      <div class="quest-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                  </div>
                `;
              }).join('') : ''}
              
              ${step.rewards && step.rewards.length > 0 ? `
                <div class="quest-rewards">
                  <strong>Récompenses :</strong><br>
                  ${step.rewards.map(reward => 
                    `<span class="quest-reward">${this.formatReward(reward)}</span>`
                  ).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
        
        ${isCompleted ? '<div class="quest-step completed"><div class="quest-step-title">✅ Quête terminée !</div></div>' : ''}
      </div>
    `;
  }

  calculateQuestProgress(quest) {
    let completed = 0;
    let total = 0;
    
    if (!quest.steps) return { completed: 0, total: 0 };
    
    quest.steps.forEach((step, stepIndex) => {
      if (step.objectives) {
        step.objectives.forEach(obj => {
          total++;
          if (stepIndex < quest.currentStepIndex || obj.completed) {
            completed++;
          }
        });
      }
    });
    
    return { completed, total };
  }

  formatReward(reward) {
    try {
      if (typeof reward === 'string') {
        reward = JSON.parse(reward);
      }
      
      switch (reward.type) {
        case 'gold':
          return `💰 ${reward.amount} pièces`;
        case 'item':
          return `📦 ${reward.itemId || reward.item || 'Objet'} x${reward.amount || 1}`;
        case 'pokemon':
          return `🎁 Pokémon spécial`;
        case 'experience':
          return `⭐ ${reward.amount} XP`;
        default:
          return `🎁 Récompense mystère`;
      }
    } catch (error) {
      console.warn("⚠️ Erreur formatReward:", error);
      return `🎁 Récompense`;
    }
  }

  handleQuestProgress(results) {
    if (!Array.isArray(results)) return;
    
    results.forEach(result => {
      if (result.questCompleted) {
        this.showNotification(`Quête terminée : ${result.questId}`, 'success');
      } else if (result.stepCompleted) {
        this.showNotification(`Étape terminée !`, 'info');
      } else if (result.message) {
        this.showNotification(result.message, 'info');
      }
    });
    
    // Actualiser la liste
    this.refreshQuests();
  }

  showQuestRewards(data) {
    if (data.rewards && data.rewards.length > 0) {
      const rewardText = data.rewards.map(r => this.formatReward(r)).join(', ');
      this.showNotification(`Récompenses reçues : ${rewardText}`, 'success');
    }
  }

  showNotification(message, type = 'info') {
    console.log(`📢 Notification journal: ${message} (${type})`);
    
    const notification = document.createElement('div');
    notification.className = 'quest-notification';
    notification.textContent = message;
    
    if (type === 'success') {
      notification.style.background = 'rgba(40, 167, 69, 0.95)';
    } else if (type === 'error') {
      notification.style.background = 'rgba(220, 53, 69, 0.95)';
    } else {
      notification.style.background = 'rgba(100, 149, 237, 0.95)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 4000);
  }

  // ✅ FIX 7: Amélioration du rafraîchissement
  refreshQuests() {
    console.log("🔄 Rafraîchissement des quêtes...");
    this.loadActiveQuests();
  }

  trackSelectedQuest() {
    if (this.currentQuestIndex >= 0 && this.activeQuests[this.currentQuestIndex]) {
      const quest = this.activeQuests[this.currentQuestIndex];
      this.showNotification(`Suivi de quête : ${quest.name}`, 'info');
      // TODO: Implémenter le système de suivi visuel
    }
  }
}
