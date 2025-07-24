// Quest/QuestSystem.js - VERSION SIMPLIFIÉE ET NETTOYÉE
// 🎯 Système unifié sans complexité excessive

export class QuestSystem {
  constructor(gameRoom, networkManager) {
    this.gameRoom = gameRoom;
    this.networkManager = networkManager;
    
    // === ÉTAT SIMPLE ===
    this.ready = false;
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    
    // === UI COMPOSANTS ===
    this.ui = null;
    this.icon = null;
    this.tracker = null;
    
    // === CALLBACKS ===
    this.onQuestUpdate = null;
    this.onQuestCompleted = null;
    this.onQuestStarted = null;
    
    console.log('📖 [QuestSystem] Instance créée - Version simplifiée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestSystem] Initialisation...');
      
      this.setupNetworkHandlers();
      await this.createUI();
      
      this.ready = true;
      console.log('✅ [QuestSystem] Prêt !');
      
      return this;
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur init:', error);
      throw error;
    }
  }
  
  // === 📡 HANDLERS RÉSEAU HARMONISÉS SERVEUR ===
  
  setupNetworkHandlers() {
    if (!this.networkManager) {
      console.warn('⚠️ [QuestSystem] Pas de NetworkManager');
      return;
    }
    
    // === MESSAGES SERVEUR DIRECTS (QuestClientMessage) ===
    this.networkManager.onMessage("quest_started", (data) => {
      this.handleQuestStarted(data);
    });
    
    this.networkManager.onMessage("quest_progress", (data) => {
      this.handleQuestProgress(data);
    });
    
    this.networkManager.onMessage("quest_completed", (data) => {
      this.handleQuestCompleted(data);
    });
    
    this.networkManager.onMessage("objective_completed", (data) => {
      this.handleObjectiveCompleted(data);
    });
    
    this.networkManager.onMessage("step_completed", (data) => {
      this.handleStepCompleted(data);
    });
    
    this.networkManager.onMessage("quest_failed", (data) => {
      this.handleQuestFailed(data);
    });
    
    this.networkManager.onMessage("quest_abandoned", (data) => {
      this.handleQuestAbandoned(data);
    });
    
    this.networkManager.onMessage("reward_received", (data) => {
      this.handleRewardReceived(data);
    });
    
    this.networkManager.onMessage("quest_available", (data) => {
      this.handleQuestAvailable(data);
    });
    
    this.networkManager.onMessage("quest_reminder", (data) => {
      this.handleQuestReminder(data);
    });
    
    this.networkManager.onMessage("system_notification", (data) => {
      this.handleSystemNotification(data);
    });
    
    this.networkManager.onMessage("error_message", (data) => {
      this.handleErrorMessage(data);
    });
    
    // === INTERACTION NPC (NpcInteractionResult) ===
    this.networkManager.onMessage("npcInteractionResult", (data) => {
      if (this.isQuestInteraction(data)) {
        this.handleNpcInteraction(data);
      }
    });
    
    // === COMPATIBILITÉ MESSAGES ANCIENS (à supprimer progressivement) ===
    this.networkManager.onMessage("activeQuestsList", (data) => {
      console.warn('⚠️ [QuestSystem] Message ancien "activeQuestsList" - à migrer vers "quest_available"');
      this.handleActiveQuests(data);
    });
    
    this.networkManager.onMessage("availableQuestsList", (data) => {
      console.warn('⚠️ [QuestSystem] Message ancien "availableQuestsList" - à migrer vers "quest_available"');
      this.handleAvailableQuests(data);
    });
    
    this.networkManager.onMessage("questStartResult", (data) => {
      console.warn('⚠️ [QuestSystem] Message ancien "questStartResult" - à migrer vers "quest_started"');
      this.handleQuestStartResult(data);
    });
    
    console.log('📡 [QuestSystem] Handlers réseau harmonisés avec serveur');
  }
  
  // === 📨 HANDLERS MESSAGES SERVEUR (QuestClientMessage) ===
  
  handleQuestStarted(data) {
    console.log('🎯 [QuestSystem] Quête démarrée:', data);
    
    // Structure QuestClientMessage
    if (data.questName && data.questId) {
      // Créer objet quest à partir des données serveur
      const quest = {
        id: data.questId,
        name: data.questName,
        description: data.description || '',
        category: data.data?.questInfo?.category || 'side',
        status: 'active',
        currentStepIndex: 0,
        steps: data.data?.steps || []
      };
      
      this.activeQuests.push(quest);
      this.updateUI();
      this.triggerCallback('onQuestStarted', quest);
    }
    
    // Afficher message
    this.showMessage(data.message || `Quête "${data.questName}" acceptée !`, 'success');
  }
  
  handleQuestProgress(data) {
    console.log('📈 [QuestSystem] Progression quête:', data);
    
    // Mettre à jour la progression si questId fourni
    if (data.questId && data.data?.progress) {
      this.updateQuestProgress(data.questId, data.data.progress);
    }
    
    // Afficher message de progression
    if (data.message) {
      this.showMessage(data.message, 'info');
    }
    
    this.updateUI();
  }
  
  handleQuestCompleted(data) {
    console.log('🎉 [QuestSystem] Quête terminée:', data);
    
    // Retirer des actives
    if (data.questId) {
      this.activeQuests = this.activeQuests.filter(q => q.id !== data.questId);
    }
    
    // Ajouter aux terminées
    const completedQuest = {
      id: data.questId,
      name: data.questName,
      description: data.description,
      completedAt: new Date(),
      rewards: data.data?.rewards || []
    };
    this.completedQuests.push(completedQuest);
    
    this.triggerCallback('onQuestCompleted', completedQuest);
    this.showMessage(data.message || `Quête terminée : ${data.questName}`, 'success');
    this.updateUI();
  }
  
  handleObjectiveCompleted(data) {
    console.log('✅ [QuestSystem] Objectif terminé:', data);
    
    // Highlight dans l'UI avec le nom de l'objectif depuis le serveur
    if (this.ui && this.ui.highlightObjectiveAsCompleted) {
      this.ui.highlightObjectiveAsCompleted({
        questId: data.questId,
        objectiveName: data.title || data.message, // Utiliser title ou message pour le nom
        ...data
      });
    }
    
    this.showMessage(data.message || `Objectif terminé : ${data.title}`, 'success');
    
    // Refresh après délai
    setTimeout(() => {
      this.requestActiveQuests();
    }, 1500);
  }
  
  handleQuestAvailable(data) {
    console.log('📋 [QuestSystem] Quête disponible:', data);
    
    this.availableQuests = this.extractQuestArray(data);
    
    if (this.availableQuests.length > 0) {
      this.showQuestSelection(this.availableQuests);
    }
  }
  
  handleStepCompleted(data) {
    console.log('🔄 [QuestSystem] Étape terminée:', data);
    
    // Afficher notification étape
    this.showMessage(`Étape terminée : ${data.stepName || 'Étape'}`, 'success');
    
    // Mettre à jour UI
    this.updateUI();
    
    // Refresh données après délai
    setTimeout(() => {
      this.requestActiveQuests();
    }, 1000);
  }
  
  handleQuestFailed(data) {
    console.log('❌ [QuestSystem] Quête échouée:', data);
    
    // Retirer des actives si nécessaire
    if (data.questId) {
      this.activeQuests = this.activeQuests.filter(q => q.id !== data.questId);
    }
    
    this.showMessage(`Quête échouée : ${data.questName || 'Quête'}`, 'error');
    this.updateUI();
  }
  
  handleQuestAbandoned(data) {
    console.log('🚫 [QuestSystem] Quête abandonnée:', data);
    
    // Retirer des actives
    if (data.questId) {
      this.activeQuests = this.activeQuests.filter(q => q.id !== data.questId);
    }
    
    this.showMessage(`Quête abandonnée : ${data.questName || 'Quête'}`, 'warning');
    this.updateUI();
  }
  
  handleRewardReceived(data) {
    console.log('🎁 [QuestSystem] Récompense reçue:', data);
    
    // Afficher notification récompense
    if (data.rewards && data.rewards.length > 0) {
      const rewardText = data.rewards.map(r => `${r.name} x${r.amount || 1}`).join(', ');
      this.showMessage(`Récompenses : ${rewardText}`, 'success');
    } else {
      this.showMessage('Récompense reçue !', 'success');
    }
    
    // Animation sur l'icône
    if (this.icon) {
      this.icon.animateQuestCompleted();
    }
  }
  
  handleQuestReminder(data) {
    console.log('🔔 [QuestSystem] Rappel quête:', data);
    
    // Afficher notification rappel
    this.showMessage(data.message || `Rappel : ${data.questName}`, 'info');
    
    // Animation sur l'icône
    if (this.icon) {
      this.icon.animateQuestProgress();
    }
  }
  
  handleSystemNotification(data) {
    console.log('📢 [QuestSystem] Notification système:', data);
    
    // Afficher selon le type de display
    const displayType = data.display?.type || 'toast';
    const theme = data.display?.theme || 'info';
    
    if (displayType === 'modal') {
      // Affichage modal si nécessaire
      if (typeof window.showGameModal === 'function') {
        window.showGameModal(data.title, data.message, data.actions);
      } else {
        this.showMessage(data.message, theme);
      }
    } else {
      // Toast par défaut
      this.showMessage(data.message, theme);
    }
  }
  
  handleErrorMessage(data) {
    console.error('💥 [QuestSystem] Erreur serveur:', data);
    
    // Afficher message d'erreur
    this.showMessage(data.message || 'Erreur dans le système de quêtes', 'error');
  }
  

  
  // === 📊 HANDLERS COMPATIBILITÉ (Messages anciens - à supprimer progressivement) ===
  
  handleActiveQuests(questsData) {
    console.log('📋 [QuestSystem] Quêtes actives (ancien format):', questsData);
    
    this.activeQuests = this.extractQuestArray(questsData);
    this.updateUI();
    this.triggerCallback('onQuestUpdate', this.activeQuests);
  }
  
  handleAvailableQuests(questsData) {
    console.log('📋 [QuestSystem] Quêtes disponibles (ancien format):', questsData);
    
    this.availableQuests = this.extractQuestArray(questsData);
    
    if (this.availableQuests.length > 0) {
      this.showQuestSelection(this.availableQuests);
    } else {
      this.showMessage('Aucune quête disponible pour le moment.', 'info');
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestSystem] Résultat démarrage (ancien format):', data);
    
    if (data.success && data.quest) {
      this.activeQuests.push(data.quest);
      this.updateUI();
      this.triggerCallback('onQuestStarted', data.quest);
      this.showMessage(`Quête "${data.quest.name}" acceptée !`, 'success');
    } else {
      this.showMessage(data.message || 'Impossible de démarrer cette quête', 'error');
    }
  }
  
  // === 🎨 INTERFACE UTILISATEUR ===
  
  async createUI() {
    try {
      // Créer l'icône
      await this.createIcon();
      
      // Créer l'interface principale
      await this.createMainUI();
      
      // Créer le tracker
      await this.createTracker();
      
      console.log('🎨 [QuestSystem] UI créée');
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur création UI:', error);
    }
  }
  
  async createIcon() {
    const { QuestIcon } = await import('./QuestIcon.js');
    this.icon = new QuestIcon(this);
    await this.icon.init();
    
    this.icon.onClick = () => {
      if (this.ui) {
        this.ui.toggle();
      }
    };
  }
  
  async createMainUI() {
    const { QuestUI } = await import('./QuestUI.js');
    this.ui = new QuestUI(this, this.gameRoom);
    await this.ui.init();
    
    this.ui.onAction = (action, data) => {
      this.handleUIAction(action, data);
    };
  }
  
  async createTracker() {
    // Le tracker est intégré dans QuestUI
    this.tracker = this.ui;
  }
  
  // === 🎮 ACTIONS UI ===
  
  handleUIAction(action, data) {
    console.log(`🎮 [QuestSystem] Action UI: ${action}`, data);
    
    switch (action) {
      case 'startQuest':
        this.startQuest(data.questId);
        break;
        
      case 'refreshQuests':
        this.requestActiveQuests();
        break;
        
      case 'getAvailableQuests':
        this.requestAvailableQuests();
        break;
        
      default:
        console.warn(`⚠️ [QuestSystem] Action inconnue: ${action}`);
    }
  }
  
  // === 💬 DIALOGUES ===
  
  showQuestGiverDialogue(data) {
    if (typeof window.showNpcDialogue !== 'function') {
      console.warn('⚠️ [QuestSystem] Système de dialogue non disponible');
      return;
    }
    
    const dialogueData = {
      name: data.npcName || data.name || 'Donneur de quêtes',
      portrait: data.portrait || '/assets/portrait/defaultPortrait.png',
      lines: data.lines || [data.message || 'J\'ai peut-être quelque chose pour vous...'],
      onClose: () => {
        setTimeout(() => {
          this.requestAvailableQuests();
        }, 500);
      }
    };
    
    window.showNpcDialogue(dialogueData);
  }
  
  showQuestProgressDialogue(data) {
    if (typeof window.showNpcDialogue !== 'function') return;
    
    const dialogueData = {
      name: data.npcName || data.name || 'PNJ',
      portrait: data.portrait || '/assets/portrait/defaultPortrait.png',
      lines: data.lines || [data.message || 'Votre progression est enregistrée.']
    };
    
    window.showNpcDialogue(dialogueData);
  }
  
  showQuestSelection(quests, npcName = 'Donneur de quêtes') {
    if (!this.ui || !this.ui.showQuestDialog) {
      console.warn('⚠️ [QuestSystem] UI de sélection non disponible');
      return;
    }
    
    this.ui.showQuestDialog('Quêtes disponibles', quests, (selectedQuestId) => {
      if (selectedQuestId) {
        this.startQuest(selectedQuestId);
      }
    });
  }
  
  // === 📡 REQUÊTES SERVEUR (Actions serveur) ===
  
  requestActiveQuests() {
    if (this.networkManager) {
      console.log('📤 [QuestSystem] Demande quêtes actives');
      // Action serveur pour obtenir les quêtes actives
      this.networkManager.sendMessage('getActiveQuests');
    }
  }
  
  requestAvailableQuests() {
    if (this.networkManager) {
      console.log('📤 [QuestSystem] Demande quêtes disponibles');
      // Action serveur pour obtenir les quêtes disponibles  
      this.networkManager.sendMessage('getAvailableQuests');
    }
  }
  
  startQuest(questId) {
    if (this.networkManager) {
      console.log(`📤 [QuestSystem] Démarrage quête: ${questId}`);
      // Action serveur pour démarrer une quête
      this.networkManager.sendMessage('startQuest', { questId });
    }
  }
  
  // === 🎭 INTERACTION NPC (selon NpcInteractionResult) ===
  
  handleNpcInteraction(data) {
    console.log('🎭 [QuestSystem] Interaction NPC quest:', data);
    
    // Vérifier le type selon NpcInteractionResult
    if (data.type === 'questGiver' || data.type === 'unifiedInterface') {
      this.handleQuestGiverInteraction(data);
    } else if (data.type === 'dialogue') {
      this.handleQuestProgressInteraction(data);
    }
  }
  
  handleQuestGiverInteraction(data) {
    console.log('🎯 [QuestSystem] Quest Giver NPC');
    
    // Utiliser availableQuests du NpcInteractionResult
    if (data.availableQuests && data.availableQuests.length > 0) {
      this.showQuestSelection(data.availableQuests, data.npcName);
      return;
    }
    
    // Vérifier contextualData pour hasQuests
    if (data.contextualData?.hasQuests) {
      // Dialogue puis demander quêtes
      if (data.lines || data.message) {
        this.showQuestGiverDialogue(data);
      }
      setTimeout(() => {
        this.requestAvailableQuests();
      }, 1000);
      return;
    }
    
    // Fallback: demander directement si c'est un questGiver
    if (data.capabilities?.includes('quest')) {
      this.requestAvailableQuests();
    }
  }
  
  handleQuestProgressInteraction(data) {
    console.log('📈 [QuestSystem] Dialogue NPC');
    
    // Afficher les lignes de dialogue
    if (data.lines || data.message) {
      this.showQuestProgressDialogue(data);
    }
    
    // Mettre à jour progression si fournie
    if (data.questRewards && data.questRewards.length > 0) {
      // Le NPC peut donner des récompenses de quête
      this.handleRewardReceived({
        rewards: data.questRewards,
        message: 'Récompenses de quête reçues !'
      });
    }
  }
  
  // === 📤 ACTIONS NPC SPÉCIFIQUES ===
  
  sendNpcAction(npcId, actionType, actionData = {}) {
    if (this.networkManager) {
      console.log(`📤 [QuestSystem] Action NPC: ${actionType} sur NPC ${npcId}`);
      
      // Selon la documentation serveur
      this.networkManager.sendMessage('npcSpecificAction', {
        npcId: npcId,
        actionType: actionType, // 'merchant' | 'quest' | 'dialogue'
        actionData: {
          questAction: actionData.questAction, // 'start' | 'complete'
          questId: actionData.questId,
          ...actionData
        }
      });
    }
  }
  
  // === 🔍 DÉTECTION TYPE NPC AMÉLIORÉE ===
  
  isQuestInteraction(data) {
    return !!(
      data.type === 'questGiver' ||
      data.type === 'unifiedInterface' ||
      data.availableQuests ||
      data.questRewards ||
      data.contextualData?.hasQuests ||
      data.capabilities?.includes('quest') ||
      (data.message && data.message.toLowerCase().includes('quête'))
    );
  }
  
  isQuestGiverData(data) {
    return !!(
      data.type === 'questGiver' ||
      data.type === 'unifiedInterface' ||
      data.availableQuests ||
      data.contextualData?.hasQuests ||
      data.capabilities?.includes('quest')
    );
  }
  
  isQuestProgressData(data) {
    return !!(
      data.type === 'dialogue' ||
      data.questRewards ||
      data.lines
    );
  }
  
  // === 🔧 UTILITAIRES ===
  
  extractQuestArray(data) {
    if (Array.isArray(data)) return data.filter(q => q?.id);
    if (data?.quests) return data.quests.filter(q => q?.id);
    if (data?.questList) return data.questList.filter(q => q?.id);
    return [];
  }
  
  updateQuestProgress(questId, progressData) {
    const quest = this.activeQuests.find(q => q.id === questId);
    if (quest && progressData) {
      Object.assign(quest, progressData);
    }
  }
  
  updateUI() {
    if (this.ui) {
      this.ui.updateQuestData(this.activeQuests, 'active');
      this.ui.updateTracker();
    }
    
    if (this.icon) {
      this.icon.updateStats({
        totalActive: this.activeQuests.length,
        newQuests: this.activeQuests.filter(q => q.isNew).length,
        readyToComplete: this.activeQuests.filter(q => q.status === 'ready').length
      });
    }
  }
  
  triggerCallback(callbackName, data) {
    const callback = this[callbackName];
    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [QuestSystem] Erreur callback ${callbackName}:`, error);
      }
    }
  }
  
  showMessage(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000 });
    } else {
      console.log(`📢 [QuestSystem] ${type.toUpperCase()}: ${message}`);
    }
  }
  
  // === 📊 API PUBLIQUE ===
  
  getActiveQuests() {
    return [...this.activeQuests];
  }
  
  getAvailableQuests() {
    return [...this.availableQuests];
  }
  
  getCompletedQuests() {
    return [...this.completedQuests];
  }
  
  hasActiveQuests() {
    return this.activeQuests.length > 0;
  }
  
  isReady() {
    return this.ready;
  }
  
  // === 🎛️ CONTRÔLES UI ===
  
  show() {
    if (this.ui) this.ui.show();
    if (this.icon) this.icon.show();
    if (this.tracker) this.tracker.showTracker();
  }
  
  hide() {
    if (this.ui) this.ui.hide();
    if (this.icon) this.icon.hide();
    if (this.tracker) this.tracker.hideTracker();
  }
  
  toggle() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  setEnabled(enabled) {
    if (this.ui) this.ui.setEnabled(enabled);
    if (this.icon) this.icon.setEnabled(enabled);
  }
  
  // === 🔗 INTÉGRATION UIMANAGER ===
  
  connectUIManager(uiManager) {
    if (this.icon?.iconElement && uiManager.registerIconPosition) {
      uiManager.registerIconPosition('quest', this.icon.iconElement, {
        anchor: 'bottom-right',
        order: 1,
        spacing: 10
      });
      return true;
    }
    return false;
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestSystem] Destruction...');
    
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    
    if (this.icon) {
      this.icon.destroy();
      this.icon = null;
    }
    
    this.tracker = null;
    this.networkManager = null;
    this.gameRoom = null;
    this.ready = false;
    
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    
    console.log('✅ [QuestSystem] Détruit');
  }
}

// === FACTORY FUNCTION ===

export async function createQuestSystem(gameRoom, networkManager) {
  try {
    console.log('🏭 [QuestFactory] Création QuestSystem simplifié...');
    
    const questSystem = new QuestSystem(gameRoom, networkManager);
    await questSystem.init();
    
    // Exposer globalement
    window.questSystem = questSystem;
    window.questSystemGlobal = questSystem;
    
    // Fonctions de compatibilité
    window.toggleQuest = () => questSystem.toggle();
    window.openQuest = () => questSystem.show();
    window.closeQuest = () => questSystem.hide();
    
    console.log('✅ [QuestFactory] QuestSystem créé avec succès');
    return questSystem;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

export default QuestSystem;
