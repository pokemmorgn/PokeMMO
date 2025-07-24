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
  
  // === 📡 HANDLERS RÉSEAU SIMPLIFIÉS ===
  
  setupNetworkHandlers() {
    if (!this.networkManager) {
      console.warn('⚠️ [QuestSystem] Pas de NetworkManager');
      return;
    }
    
    // === MESSAGES SERVEUR DIRECTS ===
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
    
    this.networkManager.onMessage("quest_available", (data) => {
      this.handleQuestAvailable(data);
    });
    
    // === INTERACTION NPC ===
    this.networkManager.onMessage("npcInteractionResult", (data) => {
      if (this.isQuestInteraction(data)) {
        this.handleNpcInteraction(data);
      }
    });
    
    // === COMPATIBILITÉ MESSAGES EXISTANTS ===
    this.networkManager.onMessage("activeQuestsList", (data) => {
      this.handleActiveQuests(data);
    });
    
    this.networkManager.onMessage("availableQuestsList", (data) => {
      this.handleAvailableQuests(data);
    });
    
    this.networkManager.onMessage("questStartResult", (data) => {
      this.handleQuestStartResult(data);
    });
    
    console.log('📡 [QuestSystem] Handlers réseau configurés');
  }
  
  // === 📨 HANDLERS MESSAGES SERVEUR ===
  
  handleQuestStarted(data) {
    console.log('🎯 [QuestSystem] Quête démarrée:', data);
    
    if (data.quest) {
      this.activeQuests.push(data.quest);
      this.updateUI();
      this.triggerCallback('onQuestStarted', data.quest);
      this.showMessage(`Quête "${data.quest.name}" acceptée !`, 'success');
    }
  }
  
  handleQuestProgress(data) {
    console.log('📈 [QuestSystem] Progression quête:', data);
    
    // Mettre à jour la progression
    if (data.questId && data.progress) {
      this.updateQuestProgress(data.questId, data.progress);
    }
    
    this.updateUI();
  }
  
  handleQuestCompleted(data) {
    console.log('🎉 [QuestSystem] Quête terminée:', data);
    
    // Retirer des actives
    this.activeQuests = this.activeQuests.filter(q => q.id !== data.questId);
    
    // Ajouter aux terminées
    this.completedQuests.push(data);
    
    this.triggerCallback('onQuestCompleted', data);
    this.showMessage(`Quête terminée : ${data.questName}`, 'success');
    this.updateUI();
  }
  
  handleObjectiveCompleted(data) {
    console.log('✅ [QuestSystem] Objectif terminé:', data);
    
    // Highlight dans l'UI
    if (this.ui && this.ui.highlightObjectiveAsCompleted) {
      this.ui.highlightObjectiveAsCompleted(data);
    }
    
    this.showMessage(`Objectif terminé : ${data.objectiveName}`, 'success');
    
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
  
  // === 🎭 INTERACTION NPC ===
  
  handleNpcInteraction(data) {
    console.log('🎭 [QuestSystem] Interaction NPC quest:', data);
    
    if (this.isQuestGiverData(data)) {
      this.handleQuestGiverInteraction(data);
    } else if (this.isQuestProgressData(data)) {
      this.handleQuestProgressInteraction(data);
    }
  }
  
  handleQuestGiverInteraction(data) {
    console.log('🎯 [QuestSystem] Quest Giver');
    
    // Quêtes directement dans la réponse
    if (data.availableQuests && data.availableQuests.length > 0) {
      this.showQuestSelection(data.availableQuests, data.npcName);
      return;
    }
    
    // Dialogue puis demander quêtes
    if (data.message || data.lines) {
      this.showQuestGiverDialogue(data);
      setTimeout(() => {
        this.requestAvailableQuests();
      }, 1000);
      return;
    }
    
    // Fallback: demander directement
    this.requestAvailableQuests();
  }
  
  handleQuestProgressInteraction(data) {
    console.log('📈 [QuestSystem] Progression NPC');
    
    if (data.message || data.lines) {
      this.showQuestProgressDialogue(data);
    }
    
    if (data.questId && data.progress) {
      this.updateQuestProgress(data.questId, data.progress);
    }
  }
  
  // === 🔍 DÉTECTION TYPE ===
  
  isQuestInteraction(data) {
    return !!(
      data.type === 'questGiver' ||
      data.questId ||
      data.availableQuests ||
      data.questData ||
      (data.message && data.message.toLowerCase().includes('quête'))
    );
  }
  
  isQuestGiverData(data) {
    return !!(
      data.type === 'questGiver' ||
      data.availableQuests ||
      (data.properties && data.properties.questGiver)
    );
  }
  
  isQuestProgressData(data) {
    return !!(
      data.type === 'questProgress' ||
      data.questId ||
      data.progress
    );
  }
  
  // === 📊 HANDLERS COMPATIBILITÉ ===
  
  handleActiveQuests(questsData) {
    console.log('📋 [QuestSystem] Quêtes actives:', questsData);
    
    this.activeQuests = this.extractQuestArray(questsData);
    this.updateUI();
    this.triggerCallback('onQuestUpdate', this.activeQuests);
  }
  
  handleAvailableQuests(questsData) {
    console.log('📋 [QuestSystem] Quêtes disponibles:', questsData);
    
    this.availableQuests = this.extractQuestArray(questsData);
    
    if (this.availableQuests.length > 0) {
      this.showQuestSelection(this.availableQuests);
    } else {
      this.showMessage('Aucune quête disponible pour le moment.', 'info');
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestSystem] Résultat démarrage:', data);
    
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
  
  // === 📡 REQUÊTES SERVEUR ===
  
  requestActiveQuests() {
    if (this.networkManager) {
      console.log('📤 [QuestSystem] Demande quêtes actives');
      this.networkManager.sendMessage('getActiveQuests');
    }
  }
  
  requestAvailableQuests() {
    if (this.networkManager) {
      console.log('📤 [QuestSystem] Demande quêtes disponibles');
      this.networkManager.sendMessage('getAvailableQuests');
    }
  }
  
  startQuest(questId) {
    if (this.networkManager) {
      console.log(`📤 [QuestSystem] Démarrage quête: ${questId}`);
      this.networkManager.sendMessage('startQuest', { questId });
    }
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
