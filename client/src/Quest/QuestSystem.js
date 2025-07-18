// Quest/QuestSystem.js - SYSTÈME SIMPLIFIÉ ET UNIFIÉ
// 🎯 Une seule classe pour gérer TOUTES les quêtes

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
    
    // === PROTECTION ANTI-SPAM ===
    this.lastInteractionTime = 0;
    this.interactionCooldown = 1000; // 1 seconde
    this.isProcessingInteraction = false;
    
    // === CALLBACKS ===
    this.onQuestUpdate = null;
    this.onQuestCompleted = null;
    this.onQuestStarted = null;
    
    console.log('📖 [QuestSystem] Instance créée - Architecture unifiée');
  }
  
  // === 🚀 INITIALISATION SIMPLE ===
  
  async init() {
    try {
      console.log('🚀 [QuestSystem] Initialisation...');
      
      await this.setupNetworkHandlers();
      await this.createUI();
      
      this.ready = true;
      console.log('✅ [QuestSystem] Prêt !');
      
      return this;
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur init:', error);
      throw error;
    }
  }
  
  // === 📡 HANDLERS RÉSEAU UNIFIÉS ===
  
  async setupNetworkHandlers() {
    if (!this.networkManager) {
      console.warn('⚠️ [QuestSystem] Pas de NetworkManager');
      return;
    }
    
    // ✅ UN SEUL HANDLER pour toutes les réponses NPC quest
    this.networkManager.onMessage("npcInteractionResult", (data) => {
      if (this.isQuestInteraction(data)) {
        this.handleQuestNpcResponse(data);
      }
    });
    
    // ✅ HANDLERS spécifiques aux quêtes
    this.networkManager.onMessage("activeQuestsList", (data) => {
      this.handleActiveQuests(data);
    });
    
    this.networkManager.onMessage("availableQuestsList", (data) => {
      this.handleAvailableQuests(data);
    });
    
    this.networkManager.onMessage("questStartResult", (data) => {
      this.handleQuestStartResult(data);
    });
    
    this.networkManager.onMessage("questProgressUpdate", (data) => {
      this.handleQuestProgress(data);
    });
    
    console.log('📡 [QuestSystem] Handlers réseau configurés');
  }
  
  // === 🎭 GESTION INTERACTION NPC PRINCIPALE ===
  
  handleNpcInteraction(interactionData, source = 'unknown') {
    console.log(`🎭 [QuestSystem] Interaction NPC depuis: ${source}`);
    console.log('📊 Data:', interactionData);
    
    // ✅ PROTECTION ANTI-SPAM STRICTE
    const now = Date.now();
    if (this.isProcessingInteraction || (now - this.lastInteractionTime) < this.interactionCooldown) {
      console.log('🚫 [QuestSystem] Interaction bloquée (cooldown ou traitement en cours)');
      return 'BLOCKED_COOLDOWN';
    }
    
    this.isProcessingInteraction = true;
    this.lastInteractionTime = now;
    
    try {
      // ✅ DÉTERMINER le type d'interaction
      if (this.isQuestGiverData(interactionData)) {
        return this.handleQuestGiverInteraction(interactionData);
      } else if (this.isQuestProgressData(interactionData)) {
        return this.handleQuestProgressInteraction(interactionData);
      } else {
        console.log('ℹ️ [QuestSystem] Pas une interaction de quête');
        return 'NOT_QUEST_INTERACTION';
      }
      
    } finally {
      // ✅ DÉBLOQUER après un délai
      setTimeout(() => {
        this.isProcessingInteraction = false;
      }, 500);
    }
  }
  
  handleQuestGiverInteraction(data) {
    console.log('🎯 [QuestSystem] Interaction Quest Giver');
    
    // ✅ Vérifier si le NPC a des quêtes directement dans la réponse
    if (data.availableQuests && data.availableQuests.length > 0) {
      console.log(`📋 [QuestSystem] ${data.availableQuests.length} quêtes disponibles directement`);
      this.showQuestSelection(data.availableQuests, data.npcName);
      return 'QUESTS_SHOWN_DIRECTLY';
    }
    
    // ✅ Sinon, afficher le dialogue puis demander les quêtes
    if (data.message || data.lines) {
      this.showQuestGiverDialogue(data);
      
      // Demander les quêtes après le dialogue
      setTimeout(() => {
        this.requestAvailableQuests();
      }, 1000);
      
      return 'DIALOGUE_SHOWN_REQUESTING_QUESTS';
    }
    
    // ✅ Fallback: demander directement les quêtes
    this.requestAvailableQuests();
    return 'REQUESTING_QUESTS_DIRECT';
  }
  
  handleQuestProgressInteraction(data) {
    console.log('📈 [QuestSystem] Interaction progression quête');
    
    // ✅ Afficher dialogue de progression
    if (data.message || data.lines) {
      this.showQuestProgressDialogue(data);
    }
    
    // ✅ Mettre à jour la progression
    if (data.questId && data.progress) {
      this.updateQuestProgress(data.questId, data.progress);
    }
    
    return 'QUEST_PROGRESS_UPDATED';
  }
  
  // === 🔍 DÉTECTION TYPE D'INTERACTION ===
  
  isQuestInteraction(data) {
    if (!data) return false;
    
    return !!(
      data.type === 'questGiver' ||
      data.type === 'questProgress' ||
      data.type === 'questComplete' ||
      data.npcType === 'questGiver' ||
      data.questId ||
      data.availableQuests ||
      data.questData ||
      (data.message && data.message.toLowerCase().includes('quête'))
    );
  }
  
  isQuestGiverData(data) {
    return !!(
      data.type === 'questGiver' ||
      data.npcType === 'questGiver' ||
      data.availableQuests ||
      (data.properties && data.properties.questGiver)
    );
  }
  
  isQuestProgressData(data) {
    return !!(
      data.type === 'questProgress' ||
      data.type === 'questComplete' ||
      data.questId ||
      data.progress
    );
  }
  
  // === 📡 HANDLERS RÉSEAU SPÉCIFIQUES ===
  
  handleQuestNpcResponse(data) {
    console.log('📨 [QuestSystem] Réponse NPC quest:', data);
    
    // ✅ Déléguer vers la méthode principale
    this.handleNpcInteraction(data, 'NetworkManager');
  }
  
  handleActiveQuests(questsData) {
    console.log('📋 [QuestSystem] Quêtes actives reçues:', questsData);
    
    this.activeQuests = this.extractQuestArray(questsData);
    this.updateUI();
    this.triggerCallback('onQuestUpdate', this.activeQuests);
  }
  
  handleAvailableQuests(questsData) {
    console.log('📋 [QuestSystem] Quêtes disponibles reçues:', questsData);
    
    this.availableQuests = this.extractQuestArray(questsData);
    
    if (this.availableQuests.length > 0) {
      this.showQuestSelection(this.availableQuests);
    } else {
      this.showMessage('Aucune quête disponible pour le moment.', 'info');
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestSystem] Résultat démarrage quête:', data);
    
    if (data.success && data.quest) {
      this.activeQuests.push(data.quest);
      this.updateUI();
      this.triggerCallback('onQuestStarted', data.quest);
      this.showMessage(`Quête "${data.quest.name}" acceptée !`, 'success');
    } else {
      this.showMessage(data.message || 'Impossible de démarrer cette quête', 'error');
    }
  }
  
  handleQuestProgress(progressData) {
    console.log('📈 [QuestSystem] Progression quête:', progressData);
    
    if (Array.isArray(progressData)) {
      progressData.forEach(update => {
        this.processQuestUpdate(update);
      });
    } else {
      this.processQuestUpdate(progressData);
    }
    
    this.updateUI();
  }
  
  processQuestUpdate(update) {
    if (update.questCompleted) {
      // ✅ Quête terminée
      this.completeQuest(update);
    } else if (update.objectiveCompleted) {
      // ✅ Objectif terminé
      this.completeObjective(update);
    } else {
      // ✅ Progression normale
      this.updateProgress(update);
    }
  }
  
  completeQuest(questData) {
    console.log(`🎉 [QuestSystem] Quête terminée: ${questData.questName}`);
    
    // Retirer des actives
    this.activeQuests = this.activeQuests.filter(q => q.id !== questData.questId);
    
    // Ajouter aux terminées
    this.completedQuests.push(questData);
    
    this.triggerCallback('onQuestCompleted', questData);
    this.showMessage(`Quête terminée : ${questData.questName}`, 'success');
  }
  
  completeObjective(objectiveData) {
    console.log(`✅ [QuestSystem] Objectif terminé: ${objectiveData.objectiveName}`);
    
    // ✅ HIGHLIGHT dans l'UI
    if (this.ui && this.ui.highlightObjectiveAsCompleted) {
      this.ui.highlightObjectiveAsCompleted(objectiveData);
    }
    
    this.showMessage(`Objectif terminé : ${objectiveData.objectiveName}`, 'success');
    
    // Refresh des données après un délai
    setTimeout(() => {
      this.requestActiveQuests();
    }, 1500);
  }
  
  updateProgress(progressData) {
    // Mettre à jour la progression d'une quête
    const quest = this.activeQuests.find(q => q.id === progressData.questId);
    if (quest && progressData.progress) {
      Object.assign(quest, progressData.progress);
    }
  }
  
  // === 🎨 INTERFACE UTILISATEUR ===
  
  async createUI() {
    try {
      // ✅ Créer l'icône
      await this.createIcon();
      
      // ✅ Créer l'interface principale
      await this.createMainUI();
      
      // ✅ Créer le tracker
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
    
    // ✅ Handler de clic
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
    
    // ✅ Handler d'actions
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
        // Demander les quêtes après fermeture du dialogue
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
  
  async createIcon() {
    // Méthode pour UIManager
    await this.createIcon();
    return this.icon?.iconElement || null;
  }
  
  connectUIManager(uiManager) {
    if (this.icon?.iconElement && uiManager.registerIconPosition) {
      uiManager.registerIconPosition('quest', this.icon.iconElement, {
        anchor: 'bottom-right',
        order: 1,
        spacing: 10
      });
    }
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

export async function createQuestSystem(gameRoom, networkManager, scene) {
  try {
    console.log('🏭 [QuestFactory] Création QuestSystem unifié...');
    
    const questSystem = new QuestSystem(gameRoom, networkManager);
    await questSystem.init();
    
    // ✅ Exposer globalement
    window.questSystem = questSystem;
    window.questSystemGlobal = questSystem;
    
    // ✅ Fonctions de compatibilité
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
