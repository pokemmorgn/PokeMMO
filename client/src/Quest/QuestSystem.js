// Quest/QuestSystem.js - VERSION NETTOYÉE ADAPTÉE AU SERVEUR
// 🧹 Messages unifiés avec le serveur QuestHandlers

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
    this.detailsUI = null;
    
    // === CALLBACKS ===
    this.onQuestUpdate = null;
    this.onQuestCompleted = null;
    this.onQuestStarted = null;
    
    console.log('📖 [QuestSystem] Instance créée - Version nettoyée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestSystem] Initialisation...');
      
      this.setupNetworkHandlers();
      await this.createUI();
      
      this.ready = true;
      console.log('✅ [QuestSystem] Prêt avec messages unifiés !');
      
      return this;
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur init:', error);
      throw error;
    }
  }

  // === 🎨 INTERFACE UTILISATEUR ===
  
  async createUI() {
    try {
      await this.createIcon();
      await this.createMainUI();
      await this.createTracker();
      await this.createQuestDetailsUI();
      
      console.log('🎨 [QuestSystem] UI créée');
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur création UI:', error);
    }
  }
  
  async createIcon() {
    const { QuestIcon } = await import('./QuestIcon.js');
    
    const optionsManager = window.optionsSystem?.manager || 
                           window.optionsSystemGlobal?.manager ||
                           window.optionsSystem;
    
    this.icon = new QuestIcon(this, optionsManager);
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
    this.tracker = this.ui;
  }
  
  async createQuestDetailsUI() {
    const { QuestDetailsUI } = await import('./QuestDetailsUI.js');
    
    const optionsManager = window.optionsSystem?.manager || 
                           window.optionsSystemGlobal?.manager ||
                           window.optionsSystem;
    
    this.detailsUI = new QuestDetailsUI(this, optionsManager);
    await this.detailsUI.init();
    
    this.detailsUI.onQuestAccept = (questId, npcId, questData) => {
      this.handleQuestAcceptFromUI(questId, npcId, questData);
    };
    
    this.detailsUI.onClose = () => {
      console.log('📋 [QuestSystem] QuestDetailsUI fermé');
    };
    
    console.log('📋 [QuestSystem] QuestDetailsUI créé et connecté');
  }
  
  // === 🎯 MÉTHODES PUBLIQUES POUR DIALOGUEMANAGER ===
  
  showQuestDetailsForNpc(npcId, availableQuestIds) {
    if (!this.detailsUI) {
      console.error('❌ [QuestSystem] QuestDetailsUI non initialisé');
      return false;
    }
    
    if (!availableQuestIds || availableQuestIds.length === 0) {
      console.warn('⚠️ [QuestSystem] Aucune quête disponible pour NPC', npcId);
      this.showMessage('Aucune quête disponible pour le moment.', 'info');
      return false;
    }
    
    console.log(`📋 [QuestSystem] Affichage quêtes pour NPC ${npcId}:`, availableQuestIds);
    
    if (availableQuestIds.length === 1) {
      this.detailsUI.showSingleQuest(npcId, availableQuestIds[0]);
    } else {
      this.detailsUI.showMultipleQuests(npcId, availableQuestIds);
    }
    
    return true;
  }
  
  handleQuestActionFromDialogue(actionData) {
    const npcId = actionData.npcId;
    
    if (!npcId) {
      console.error('❌ [QuestSystem] NPC ID manquant dans action quest');
      return false;
    }
    
    console.log(`🎯 [QuestSystem] Action quest reçue pour NPC ${npcId}`);
    
    const questData = this.networkManager.getNpcQuestData(npcId);
    
    if (questData.availableQuestIds.length > 0) {
      return this.showQuestDetailsForNpc(npcId, questData.availableQuestIds);
    } else {
      this.showMessage('Ce PNJ n\'a pas de quêtes disponibles pour le moment.', 'info');
      return false;
    }
  }
  
  // === 📡 HANDLERS RÉSEAU NETTOYÉS ===
  
  setupNetworkHandlers() {
    if (!this.networkManager) {
      console.warn('⚠️ [QuestSystem] Pas de NetworkManager');
      return;
    }
    
    // ✅ HANDLER PRINCIPAL: Résultat acceptation (du serveur nettoyé)
    this.networkManager.onMessage("questAcceptResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questAcceptResult:', data);
      this.handleQuestAcceptResult(data);
    });
    
    // ✅ HANDLER: Détails de quête
    this.networkManager.onMessage("questDetailsResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questDetailsResult:', data);
      // Géré par QuestDetailsUI directement via NetworkManager
    });
    
    // ✅ HANDLER: Statuts NPCs
    this.networkManager.onMessage("questStatuses", (data) => {
      console.log('📨 [QuestSystem] REÇU questStatuses:', data);
      // Géré par NetworkInteractionHandler pour les indicateurs NPCs
    });
    
    // === HANDLERS AUTRES ÉVÉNEMENTS QUEST ===
    
    this.networkManager.onMessage("questProgressUpdate", (data) => {
      console.log('📨 [QuestSystem] REÇU questProgressUpdate:', data);
      this.handleQuestProgressUpdate(data);
    });
    
    this.networkManager.onMessage("activeQuestsList", (data) => {
      console.log('📨 [QuestSystem] REÇU activeQuestsList:', data);
      this.handleActiveQuests(data);
    });
    
    this.networkManager.onMessage("availableQuestsList", (data) => {
      console.log('📨 [QuestSystem] REÇU availableQuestsList:', data);
      this.handleAvailableQuests(data);
    });
    
    this.networkManager.onMessage("questStartResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questStartResult:', data);
      this.handleQuestStartResult(data);
    });
    
    this.networkManager.onMessage("introQuestCompleted", (data) => {
      console.log('📨 [QuestSystem] REÇU introQuestCompleted:', data);
      this.handleIntroQuestCompleted(data);
    });
    
    this.networkManager.onMessage("questDebugInfo", (data) => {
      console.log('📨 [QuestSystem] REÇU questDebugInfo:', data);
      console.table(data);
    });
    
    // === INTERACTION NPC (pour compatibilité) ===
    this.networkManager.onMessage("npcInteractionResult", (data) => {
      if (this.isQuestInteraction(data)) {
        console.log('📋 [QuestSystem] Interaction NPC quest détectée - DialogueManager va gérer');
        console.log('📋 [QuestSystem] Données disponibles pour boutons:', data);
      }
    });
    
    console.log('📡 [QuestSystem] Handlers réseau nettoyés configurés');
  }
  
  // === 🎬 HANDLER PRINCIPAL: ACCEPTATION QUÊTE ===
  
  handleQuestAcceptResult(data) {
    console.log('🎯 [QuestSystem] === DÉBUT handleQuestAcceptResult ===');
    console.log('📊 Data reçue:', data);
    
    if (data.success) {
      // ✅ SUCCÈS
      const questName = data.quest?.name || data.questName || data.questId;
      const message = data.message || `Quête "${questName}" acceptée !`;
      
      console.log('✅ [QuestSystem] Acceptation réussie:', questName);
      
      // Notification utilisateur
      this.showMessage(message, 'success');
      
      // Ajouter à la liste des quêtes actives
      if (data.quest) {
        // Vérifier si pas déjà présente
        const existingQuest = this.activeQuests.find(q => q.id === data.quest.id);
        if (!existingQuest) {
          this.activeQuests.push(data.quest);
          this.updateUI();
          console.log('📝 [QuestSystem] Quête ajoutée aux actives');
        }
      }
      
      // Animation icône
      if (this.icon) {
        this.icon.animateNewQuest();
      }
      
      // Callback
      this.triggerCallback('onQuestStarted', data.quest);
      
    } else {
      // ❌ ÉCHEC
      const errorMsg = data.message || data.error || 'Impossible d\'accepter la quête';
      console.error('❌ [QuestSystem] Acceptation échouée:', errorMsg);
      
      this.showMessage(errorMsg, 'error');
      
      // Messages d'aide selon l'erreur
      if (errorMsg.includes('niveau') || errorMsg.includes('prérequis')) {
        this.showMessage('Vérifiez vos prérequis dans le journal des quêtes', 'info');
      }
    }
    
    console.log('🎯 [QuestSystem] === FIN handleQuestAcceptResult ===');
  }
  
  // === 🎬 ACCEPTATION DEPUIS UI ===
  
  handleQuestAcceptFromUI(questId, npcId, questData) {
    console.log(`🎯 [QuestSystem] Acceptation quête depuis UI: ${questId} pour NPC ${npcId}`);
    
    if (!this.networkManager) {
      console.error('❌ [QuestSystem] NetworkManager non disponible');
      this.showMessage('Erreur réseau - impossible d\'accepter la quête', 'error');
      return false;
    }
    
    try {
      // Feedback immédiat
      const questName = questData?.name || questId;
      this.showMessage(`Demande d'acceptation : ${questName}`, 'info', { duration: 2000 });
      
      // ✅ ENVOYER MESSAGE UNIFIÉ AU SERVEUR
      this.networkManager.sendMessage('acceptQuest', {
        questId: questId,
        npcId: npcId,
        timestamp: Date.now()
      });
      
      console.log(`✅ [QuestSystem] Demande acceptation envoyée: ${questId}`);
      return true;
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur acceptation quête:', error);
      this.showMessage('Erreur lors de l\'acceptation de la quête', 'error');
      return false;
    }
  }
  
  // === 📊 HANDLERS AUTRES ÉVÉNEMENTS ===
  
  handleQuestProgressUpdate(data) {
    console.log('📈 [QuestSystem] Progression quête:', data);
    
    if (Array.isArray(data)) {
      data.forEach(result => {
        if (result.objectiveCompleted && this.ui && this.ui.highlightObjectiveAsCompleted) {
          this.ui.highlightObjectiveAsCompleted({
            questId: result.questId,
            objectiveName: result.objectiveName || result.message,
            ...result
          });
        }
        
        if (result.message) {
          this.showMessage(result.message, 'success');
        }
      });
    }
    
    // Rafraîchir l'UI après un délai
    setTimeout(() => {
      this.requestActiveQuests();
    }, 1500);
  }
  
  handleActiveQuests(data) {
    console.log('📋 [QuestSystem] Quêtes actives reçues:', data);
    
    this.activeQuests = this.extractQuestArray(data);
    this.updateUI();
    this.triggerCallback('onQuestUpdate', this.activeQuests);
  }
  
  handleAvailableQuests(data) {
    console.log('📋 [QuestSystem] Quêtes disponibles reçues:', data);
    
    this.availableQuests = this.extractQuestArray(data);
    
    // Pas d'auto-ouverture - juste stockage
    if (this.availableQuests.length > 0) {
      console.log(`📋 [QuestSystem] ${this.availableQuests.length} quêtes disponibles stockées`);
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestSystem] Résultat démarrage quête:', data);
    
    if (data.success && data.quest) {
      const existingQuest = this.activeQuests.find(q => q.id === data.quest.id);
      if (!existingQuest) {
        this.activeQuests.push(data.quest);
        this.updateUI();
      }
      
      this.triggerCallback('onQuestStarted', data.quest);
      this.showMessage(data.message || `Quête "${data.quest.name}" démarrée !`, 'success');
    } else {
      this.showMessage(data.message || 'Impossible de démarrer cette quête', 'error');
    }
  }
  
  handleIntroQuestCompleted(data) {
    console.log('🎉 [QuestSystem] Quête d\'intro terminée:', data);
    
    this.showMessage(data.message || 'Félicitations !', 'success');
    
    if (data.reward) {
      setTimeout(() => {
        this.showMessage(data.reward, 'info');
      }, 2000);
    }
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
  
  // === 🎭 DÉTECTION INTERACTION NPC ===
  
  handleNpcInteraction(data) {
    console.log('🎭 [QuestSystem] handleNpcInteraction appelé:', data);
    
    if (this.isQuestInteraction(data)) {
      console.log('🎯 [QuestSystem] Données quête détectées - disponibles pour DialogueManager');
    }
    
    return { handled: false, reason: 'delegated_to_dialogue_manager' };
  }
  
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
  
  showMessage(message, type = 'info', options = {}) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000, ...options });
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
  }
  
  hide() {
    if (this.ui) this.ui.hide();
    if (this.icon) this.icon.hide();
    if (this.tracker) this.tracker.hideTracker();
    
    if (this.detailsUI && this.detailsUI.isVisible) {
      this.detailsUI.hide();
    }
  }
  
  toggle() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  setEnabled(enabled) {
    if (this.ui) this.ui.setEnabled(enabled);
    if (this.icon) this.icon.setEnabled(enabled);
    if (this.detailsUI) this.detailsUI.setEnabled(enabled);
  }
  
  // === 🔗 INTÉGRATION UIMANAGER ===
  
  connectUIManager(uiManager) {
    console.log('🔗 [QuestSystem] Connexion UIManager...');
    
    if (!uiManager || !uiManager.registerIconPosition) {
      console.error('❌ [QuestSystem] UIManager invalide');
      return false;
    }
    
    if (!this.icon || !this.icon.iconElement) {
      console.error('❌ [QuestSystem] Icône non disponible');
      return false;
    }
    
    try {
      uiManager.registerIconPosition('quest', this.icon.iconElement, {
        anchor: 'bottom-right',
        order: 1,
        spacing: 10,
        group: 'ui-icons'
      });
      
      this.icon.iconElement.setAttribute('data-positioned-by', 'uimanager');
      
      console.log('✅ [QuestSystem] UIManager connecté - icône enregistrée');
      return true;
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur connexion UIManager:', error);
      return false;
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
    
    if (this.detailsUI) {
      this.detailsUI.destroy();
      this.detailsUI = null;
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
    console.log('🏭 [QuestFactory] Création QuestSystem nettoyé...');
    
    const questSystem = new QuestSystem(gameRoom, networkManager);
    await questSystem.init();
    
    // Exposer globalement
    window.questSystem = questSystem;
    window.questSystemGlobal = questSystem;
    
    // Fonctions de compatibilité
    window.toggleQuest = () => questSystem.toggle();
    window.openQuest = () => questSystem.show();
    window.closeQuest = () => questSystem.hide();
    
    // Fonctions de test
    window.testQuestDetailsUI = (npcId = 2, questIds = ['test_quest_1']) => {
      console.log('🧪 Test QuestDetailsUI...');
      return questSystem.showQuestDetailsForNpc(npcId, questIds);
    };
    
    window.testQuestAction = (npcId = 2) => {
      console.log('🧪 Test action quest DialogueManager...');
      return questSystem.handleQuestActionFromDialogue({ npcId });
    };
    
    console.log('✅ [QuestFactory] QuestSystem créé - Version nettoyée adaptée au serveur');
    console.log('🎯 Messages unifiés: acceptQuest → questAcceptResult');
    console.log('🧪 Fonctions test: window.testQuestDetailsUI(), window.testQuestAction()');
    
    return questSystem;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

export default QuestSystem;
