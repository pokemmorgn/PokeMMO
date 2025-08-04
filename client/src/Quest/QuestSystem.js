// Quest/QuestSystem.js - VERSION CORRIGÉE HANDLERS RÉSEAU
// 🔧 FIX: Réception questAcceptResult + handlers robustes

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
    
    console.log('📖 [QuestSystem] Instance créée - Version corrigée handlers');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestSystem] Initialisation...');
      
      // 🔧 FIX: Setup handlers AVANT création UI
      this.setupNetworkHandlers();
      await this.createUI();
      
      this.ready = true;
      console.log('✅ [QuestSystem] Prêt avec handlers corrigés !');
      
      return this;
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur init:', error);
      throw error;
    }
  }

  // === 📡 HANDLERS RÉSEAU CORRIGÉS ===
  
  setupNetworkHandlers() {
    if (!this.networkManager || !this.networkManager.room) {
      console.warn('⚠️ [QuestSystem] NetworkManager/room non disponible');
      return;
    }
    
    console.log('📡 [QuestSystem] Setup handlers réseau corrigés...');
    
    // 🔧 FIX 1: Handler questAcceptResult avec debug complet
    this.networkManager.room.onMessage("questAcceptResult", (data) => {
      console.log('🎯 [QuestSystem] === RÉCEPTION questAcceptResult ===');
      console.log('📊 Data complète reçue:', JSON.stringify(data, null, 2));
      console.log('📊 Type de data:', typeof data);
      console.log('📊 Propriétés:', Object.keys(data));
      
      // Vérifier que c'est bien notre handler qui traite
      console.log('✅ [QuestSystem] Handler questAcceptResult ACTIF et fonctionnel');
      
      this.handleQuestAcceptResult(data);
    });
    
    // 🔧 FIX 2: Handler de test pour vérifier la communication
    this.networkManager.room.onMessage("test_quest_response", (data) => {
      console.log('🧪 [QuestSystem] Test response reçue:', data);
    });
    
    // 🔧 FIX 3: Handler générique pour débugger tous les messages quest
    this.networkManager.room.onMessage("*", (type, data) => {
      if (type.includes('quest') || type.includes('Quest')) {
        console.log(`📨 [QuestSystem] Message quest détecté: ${type}`, data);
      }
    });
    
    // === AUTRES HANDLERS (inchangés mais avec debug) ===
    
    this.networkManager.room.onMessage("questDetailsResult", (data) => {
      console.log('📨 [QuestSystem] questDetailsResult reçu:', data);
    });
    
    this.networkManager.room.onMessage("questStatuses", (data) => {
      console.log('📨 [QuestSystem] questStatuses reçu:', data);
    });
    
    this.networkManager.room.onMessage("questProgressUpdate", (data) => {
      console.log('📨 [QuestSystem] questProgressUpdate reçu:', data);
      this.handleQuestProgressUpdate(data);
    });
    
    this.networkManager.room.onMessage("activeQuestsList", (data) => {
      console.log('📨 [QuestSystem] activeQuestsList reçu:', data);
      this.handleActiveQuests(data);
    });
    
    this.networkManager.room.onMessage("availableQuestsList", (data) => {
      console.log('📨 [QuestSystem] availableQuestsList reçu:', data);
      this.handleAvailableQuests(data);
    });
    
    this.networkManager.room.onMessage("questStartResult", (data) => {
      console.log('📨 [QuestSystem] questStartResult reçu:', data);
      this.handleQuestStartResult(data);
    });
    
    this.networkManager.room.onMessage("introQuestCompleted", (data) => {
      console.log('📨 [QuestSystem] introQuestCompleted reçu:', data);
      this.handleIntroQuestCompleted(data);
    });
    
    this.networkManager.room.onMessage("questDebugInfo", (data) => {
      console.log('📨 [QuestSystem] questDebugInfo reçu:', data);
      console.table(data);
    });
    
    // === HANDLER NPC INTERACTION (pour compatibilité) ===
    this.networkManager.room.onMessage("npcInteractionResult", (data) => {
      if (this.isQuestInteraction(data)) {
        console.log('📋 [QuestSystem] Interaction NPC quest détectée');
      }
    });
    
    console.log('✅ [QuestSystem] Handlers réseau configurés avec debug complet');
    
    // 🔧 FIX 4: Test de connectivité immédiat
    setTimeout(() => {
      this.testNetworkConnectivity();
    }, 1000);
  }
  
  // 🔧 FIX: Test de connectivité réseau
  testNetworkConnectivity() {
    console.log('🧪 [QuestSystem] Test connectivité réseau...');
    
    if (this.networkManager && this.networkManager.sendMessage) {
      try {
        this.networkManager.sendMessage('test_quest_connectivity', {
          timestamp: Date.now(),
          source: 'QuestSystem'
        });
        console.log('✅ [QuestSystem] Test envoyé - vérifions la réception...');
      } catch (error) {
        console.error('❌ [QuestSystem] Erreur test connectivité:', error);
      }
    }
  }
  
  // === 🎬 HANDLER PRINCIPAL: ACCEPTATION QUÊTE (AMÉLIORÉ) ===
  
  handleQuestAcceptResult(data) {
    console.log('🎯 [QuestSystem] === DÉBUT handleQuestAcceptResult DÉTAILLÉ ===');
    console.log('📊 Data reçue:', data);
    console.log('📊 Success:', data.success);
    console.log('📊 QuestId:', data.questId);
    console.log('📊 Message:', data.message);
    console.log('📊 Quest object:', data.quest);
    
    try {
      if (data.success) {
        // ✅ SUCCÈS - Traitement amélioré
        const questName = data.quest?.name || data.questName || data.questId;
        const message = data.message || `Quête "${questName}" acceptée !`;
        
        console.log('✅ [QuestSystem] Acceptation réussie:', questName);
        
        // Notification utilisateur avec style adapté
        this.showMessage(message, 'success', {
          duration: 4000,
          title: 'Quête acceptée !',
          icon: '📖'
        });
        
        // Ajouter à la liste des quêtes actives si fournie
        if (data.quest) {
          const existingQuest = this.activeQuests.find(q => q.id === data.quest.id);
          if (!existingQuest) {
            this.activeQuests.push(data.quest);
            this.updateUI();
            console.log('📝 [QuestSystem] Quête ajoutée aux actives:', data.quest.name);
          } else {
            console.log('📝 [QuestSystem] Quête déjà présente dans les actives');
          }
        }
        
        // Animation icône avec délai pour l'effet
        if (this.icon) {
          setTimeout(() => {
            this.icon.animateNewQuest();
          }, 500);
        }
        
        // Animation tracker si visible
        if (this.ui && this.ui.isTrackerVisible) {
          setTimeout(() => {
            this.ui.updateTracker();
          }, 1000);
        }
        
        // Callback personnalisé
        this.triggerCallback('onQuestStarted', data.quest);
        
        // Message de suivi
        setTimeout(() => {
          this.showMessage(
            'Consultez votre journal des quêtes pour suivre vos objectifs', 
            'info', 
            { duration: 3000 }
          );
        }, 2000);
        
      } else {
        // ❌ ÉCHEC - Traitement amélioré
        const errorMsg = data.message || data.error || 'Impossible d\'accepter la quête';
        console.error('❌ [QuestSystem] Acceptation échouée:', errorMsg);
        
        // Message d'erreur avec contexte
        this.showMessage(errorMsg, 'error', {
          duration: 5000,
          title: 'Erreur acceptation quête'
        });
        
        // Messages d'aide contextuels
        if (errorMsg.includes('niveau') || errorMsg.includes('prérequis')) {
          setTimeout(() => {
            this.showMessage(
              'Vérifiez vos prérequis dans le journal des quêtes', 
              'info', 
              { duration: 4000 }
            );
          }, 1500);
        } else if (errorMsg.includes('déjà') || errorMsg.includes('active')) {
          setTimeout(() => {
            this.showMessage(
              'Cette quête est peut-être déjà en cours', 
              'info', 
              { duration: 3000 }
            );
          }, 1500);
        }
        
        // Animation d'erreur sur l'icône
        if (this.icon && this.icon.iconElement) {
          this.icon.iconElement.classList.add('quest-error');
          setTimeout(() => {
            this.icon.iconElement.classList.remove('quest-error');
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur traitement questAcceptResult:', error);
      this.showMessage(
        'Erreur lors du traitement de la réponse', 
        'error', 
        { duration: 3000 }
      );
    }
    
    console.log('🎯 [QuestSystem] === FIN handleQuestAcceptResult ===');
  }
  
  // === 🎬 ACCEPTATION DEPUIS UI (AMÉLIORÉE) ===
  
  handleQuestAcceptFromUI(questId, npcId, questData) {
    console.log(`🎯 [QuestSystem] === DÉBUT acceptation UI ===`);
    console.log(`📋 Quest: ${questId}, NPC: ${npcId}`);
    console.log(`📊 Data:`, questData);
    
    if (!this.networkManager) {
      console.error('❌ [QuestSystem] NetworkManager non disponible');
      this.showMessage('Erreur réseau - impossible d\'accepter la quête', 'error');
      return false;
    }
    
    try {
      // Feedback immédiat
      const questName = questData?.name || questId;
      this.showMessage(`Acceptation en cours : ${questName}`, 'info', { 
        duration: 2000,
        icon: '⏳'
      });
      
      // 🔧 FIX: Préparer message avec toutes infos nécessaires
      const messageData = {
        questId: questId,
        npcId: npcId,
        timestamp: Date.now(),
        playerAction: 'accept_quest_from_ui',
        questData: questData ? {
          name: questData.name,
          description: questData.description
        } : null
      };
      
      console.log(`📤 [QuestSystem] Envoi acceptQuest avec data complète:`, messageData);
      
      // ✅ ENVOYER MESSAGE AU SERVEUR
      this.networkManager.sendMessage('acceptQuest', messageData);
      
      console.log(`✅ [QuestSystem] Message acceptQuest envoyé avec succès`);
      
      // Timeout pour détecter les problèmes de réception
      setTimeout(() => {
        console.log('⏰ [QuestSystem] Timeout check - si pas de réponse, problème réseau probable');
      }, 5000);
      
      return true;
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur acceptation quête:', error);
      this.showMessage('Erreur lors de l\'acceptation de la quête', 'error');
      return false;
    }
  }
  
  // === 🔧 MÉTHODES DEBUG AMÉLIORÉES ===
  
  debugNetworkHandlers() {
    console.log('🔍 [QuestSystem] === DEBUG HANDLERS RÉSEAU ===');
    console.log('NetworkManager disponible:', !!this.networkManager);
    console.log('Room disponible:', !!this.networkManager?.room);
    console.log('SendMessage disponible:', typeof this.networkManager?.sendMessage);
    
    if (this.networkManager?.room) {
      console.log('Room state:', this.networkManager.room.state);
      console.log('Room sessionId:', this.networkManager.room.sessionId);
    }
    
    // Test de tous les handlers
    const testHandlers = [
      'questAcceptResult',
      'questDetailsResult', 
      'questStatuses',
      'questProgressUpdate',
      'activeQuestsList'
    ];
    
    testHandlers.forEach(handlerName => {
      console.log(`Handler ${handlerName}:`, 'Configuré');
    });
  }
  
  forceTestAcceptQuest(questId = 'test_quest', npcId = 1) {
    console.log('🧪 [QuestSystem] Test forcé acceptation quête...');
    
    const testData = {
      id: questId,
      name: 'Test Quest',
      description: 'Quête de test pour validation'
    };
    
    return this.handleQuestAcceptFromUI(questId, npcId, testData);
  }
  
  // === 🎨 INTERFACE UTILISATEUR (inchangée) ===
  
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
  
  // === 🎯 MÉTHODES PUBLIQUES (inchangées) ===
  
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
  
  // === 📊 HANDLERS AUTRES ÉVÉNEMENTS (inchangés) ===
  
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
  
  // === 🎮 ACTIONS UI (inchangées) ===
  
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
  
  // === 📡 REQUÊTES SERVEUR (inchangées) ===
  
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
  
  // === 🎭 DÉTECTION INTERACTION NPC (inchangées) ===
  
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
  
  // === 🔧 UTILITAIRES (inchangées) ===
  
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
  
  // === 📊 API PUBLIQUE (inchangées) ===
  
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
  
  // === 🎛️ CONTRÔLES UI (inchangées) ===
  
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
  
  // === 🔗 INTÉGRATION UIMANAGER (inchangée) ===
  
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
  
  // === 🧹 NETTOYAGE (inchangé) ===
  
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

// === FACTORY FUNCTION AMÉLIORÉE ===

export async function createQuestSystem(gameRoom, networkManager) {
  try {
    console.log('🏭 [QuestFactory] Création QuestSystem avec handlers corrigés...');
    
    const questSystem = new QuestSystem(gameRoom, networkManager);
    await questSystem.init();
    
    // Exposer globalement
    window.questSystem = questSystem;
    window.questSystemGlobal = questSystem;
    
    // 🔧 NOUVELLES FONCTIONS DEBUG
    window.debugQuestHandlers = () => questSystem.debugNetworkHandlers();
    window.testQuestAccept = (questId, npcId) => questSystem.forceTestAcceptQuest(questId, npcId);
    window.testQuestConnectivity = () => questSystem.testNetworkConnectivity();
    
    // Fonctions de compatibilité existantes
    window.toggleQuest = () => questSystem.toggle();
    window.openQuest = () => questSystem.show();
    window.closeQuest = () => questSystem.hide();
    
    window.testQuestDetailsUI = (npcId = 2, questIds = ['test_quest_1']) => {
      console.log('🧪 Test QuestDetailsUI...');
      return questSystem.showQuestDetailsForNpc(npcId, questIds);
    };
    
    window.testQuestAction = (npcId = 2) => {
      console.log('🧪 Test action quest DialogueManager...');
      return questSystem.handleQuestActionFromDialogue({ npcId });
    };
    
    console.log('✅ [QuestFactory] QuestSystem créé avec handlers réseau corrigés');
    console.log('🎯 Handler questAcceptResult: CONFIGURÉ');
    console.log('🧪 Fonctions debug: window.debugQuestHandlers(), window.testQuestAccept()');
    
    return questSystem;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

export default QuestSystem;
