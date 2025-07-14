// Quest/QuestManager.js - AVEC INTÉGRATION NETWORKMANAGER COMPLÈTE
// 🎯 État dialogue = TOUT BLOQUÉ + Connexion NetworkManager + Handlers serveur

export class QuestManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    
    // === ÉTAT SYSTÈME SIMPLE ===
    this.systemState = 'UNINITIALIZED'; // UNINITIALIZED, WAITING_ROOM, READY, ERROR
    this.dialogueState = 'NONE'; // NONE, SHOWING_QUEST_SELECTION, SHOWING_COMPLETION
    this.initialized = false;
    
    // === DONNÉES ===
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    
    // === STATS ===
    this.questStats = {
      totalActive: 0,
      totalCompleted: 0,
      newQuests: 0,
      readyToComplete: 0
    };
    
    // === CALLBACKS ===
    this.onQuestUpdate = null;
    this.onQuestStarted = null;
    this.onQuestCompleted = null;
    this.onQuestProgress = null;
    this.onStatsUpdate = null;
    
    // === CONNEXIONS ===
    this.questUI = null;
    this.networkManager = null; // ✅ NOUVEAU: Référence NetworkManager
    
    // === CONFIG ===
    this.config = {
      maxWaitTime: 10000,
      handlerRetryDelay: 500,
      maxHandlerRetries: 5
    };
    
    console.log('📖 [QuestManager] Instance créée - Intégration NetworkManager');
    
    // Si gameRoom fournie, commencer l'initialisation
    if (gameRoom) {
      this.setGameRoom(gameRoom);
    }
  }
  
  // === 🎯 GESTION D'ÉTAT ULTRA-SIMPLE ===
  
  setState(newState, reason = '') {
    const oldState = this.systemState;
    this.systemState = newState;
    console.log(`🔄 [QuestManager] État: ${oldState} → ${newState}${reason ? ` (${reason})` : ''}`);
  }
  
  setDialogueState(newState) {
    const oldState = this.dialogueState;
    this.dialogueState = newState;
    console.log(`💬 [QuestManager] Dialogue: ${oldState} → ${newState}`);
  }
  
  // === 🚫 BLOCAGE SIMPLE COMME UNREAL ===
  
  canProcessInteraction() {
    // Si en dialogue = RIEN ne passe
    if (this.dialogueState !== 'NONE') {
      console.log('🚫 [QuestManager] BLOQUÉ - En dialogue');
      return false;
    }
    
    // Si système pas prêt = RIEN ne passe  
    if (this.systemState !== 'READY') {
      console.log('🚫 [QuestManager] BLOQUÉ - Système pas prêt');
      return false;
    }
    
    return true;
  }
  
  // === 🔗 CONFIGURATION GAMEROOM ===
  
  setGameRoom(gameRoom) {
    console.log('🔗 [QuestManager] Configuration GameRoom...');
    
    if (!this.validateGameRoom(gameRoom)) {
      this.setState('ERROR', 'GameRoom invalide');
      throw new Error('GameRoom invalide');
    }
    
    this.gameRoom = gameRoom;
    this.setState('WAITING_ROOM', 'GameRoom configurée');
    this.waitForValidGameRoom();
  }
  
  validateGameRoom(gameRoom) {
    if (!gameRoom) return false;
    if (typeof gameRoom.send !== 'function') return false;
    if (typeof gameRoom.onMessage !== 'function') return false;
    return true;
  }
  
  async waitForValidGameRoom() {
    console.log('⏳ [QuestManager] Attente GameRoom prête...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      if (this.isGameRoomReady()) {
        console.log('✅ [QuestManager] GameRoom prête');
        this.registerHandlers();
        return true;
      }
      
      await this.wait(100);
    }
    
    console.error('❌ [QuestManager] Timeout GameRoom');
    this.setState('ERROR', 'Timeout GameRoom');
    return false;
  }
  
  isGameRoomReady() {
    if (!this.gameRoom) return false;
    if (!this.gameRoom.sessionId) return false;
    if (typeof this.gameRoom.onMessage !== 'function') return false;
    if (typeof this.gameRoom.send !== 'function') return false;
    return true;
  }
  
  // === 📡 ENREGISTREMENT HANDLERS SIMPLE ===
  
  registerHandlers() {
    console.log('📡 [QuestManager] Enregistrement handlers...');
    
    try {
      this.gameRoom.onMessage("activeQuestsList", (data) => {
        this.handleActiveQuestsReceived(data);
      });
      
      this.gameRoom.onMessage("availableQuestsList", (data) => {
        this.handleAvailableQuestsReceived(data);
      });
      
      this.gameRoom.onMessage("questStartResult", (data) => {
        this.handleQuestStartResult(data);
      });
      
      this.gameRoom.onMessage("questGranted", (data) => {
        this.handleQuestGranted(data);
      });
      
      this.gameRoom.onMessage("questProgressUpdate", (data) => {
        this.handleQuestProgressUpdate(data);
      });
      
      this.gameRoom.onMessage("questCompleted", (data) => {
        this.handleQuestCompleted(data);
      });
      
      console.log('✅ [QuestManager] Handlers enregistrés');
      this.setState('READY', 'Handlers enregistrés');
      this.requestInitialData();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handlers:', error);
      this.setState('ERROR', 'Erreur handlers');
    }
  }
  
  // === ✅ NOUVEAU: CONNEXION NETWORKMANAGER ===
  
  connectNetworkManager(networkManager) {
    console.log('🔗 [QuestManager] Connexion NetworkManager...');
    
    if (!networkManager) {
      console.warn('⚠️ [QuestManager] NetworkManager null');
      return false;
    }
    
    this.networkManager = networkManager;
    
    // ✅ S'abonner aux callbacks NetworkManager pour les quests
    if (typeof networkManager.onNpcInteraction === 'function') {
      console.log('📡 [QuestManager] Abonnement onNpcInteraction...');
      
      networkManager.onNpcInteraction((data) => {
        console.log('📨 [QuestManager] Message NPC via NetworkManager:', data);
        this.handleNetworkManagerResponse(data);
      });
      
      console.log('✅ [QuestManager] NetworkManager connecté');
      return true;
    } else {
      console.warn('⚠️ [QuestManager] NetworkManager.onNpcInteraction non disponible');
      return false;
    }
  }
  
  // ✅ NOUVEAU: Handler pour réponses NetworkManager
  handleNetworkManagerResponse(data) {
    console.log('📨 [QuestManager] === RÉPONSE NETWORKMANAGER ===');
    console.log('📊 Data:', data);
    
    // Vérifier si c'est une réponse quest
    if (!this.isQuestRelatedResponse(data)) {
      console.log('ℹ️ [QuestManager] Réponse non-quest, ignorée');
      return;
    }
    
    // Déléguer au handler serveur normal
    this.handleServerResponse(data);
  }
  
  // ✅ NOUVEAU: Détection réponse quest
  isQuestRelatedResponse(data) {
    if (!data) return false;
    
    const questIndicators = [
      data.type === 'questGiver',
      data.type === 'questComplete',
      data.type === 'quest',
      data.availableQuests && Array.isArray(data.availableQuests),
      data.questData !== undefined,
      data.questId !== undefined,
      data.questStarted === true,
      data.questCompleted === true,
      data.questName !== undefined,
      data.questProgress !== undefined
    ];
    
    return questIndicators.some(indicator => indicator);
  }
  
  // === 🚀 INITIALISATION PUBLIQUE ===
  
  async init(gameRoom = null, networkManager = null) {
    console.log('🚀 [QuestManager] Initialisation...');
    
    try {
      if (gameRoom) {
        this.setGameRoom(gameRoom);
      }
      
      if (!this.gameRoom) {
        throw new Error('Aucune GameRoom');
      }
      
      // ✅ NOUVEAU: Connecter NetworkManager si fourni
      if (networkManager) {
        this.connectNetworkManager(networkManager);
      } else {
        // Chercher NetworkManager global
        if (window.globalNetworkManager) {
          console.log('🔍 [QuestManager] NetworkManager global trouvé');
          this.connectNetworkManager(window.globalNetworkManager);
        } else {
          console.warn('⚠️ [QuestManager] Aucun NetworkManager disponible');
        }
      }
      
      // Attendre que le système soit prêt
      const success = await this.waitForReadyState();
      
      if (!success) {
        throw new Error('Système non prêt');
      }
      
      this.initialized = true;
      console.log('✅ [QuestManager] Initialisé');
      
      return this;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur init:', error);
      throw error;
    }
  }
  
  async waitForReadyState() {
    console.log('⏳ [QuestManager] Attente état READY...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      if (this.systemState === 'READY') {
        return true;
      }
      
      if (this.systemState === 'ERROR') {
        return false;
      }
      
      await this.wait(100);
    }
    
    console.error('❌ [QuestManager] Timeout état READY');
    return false;
  }
  
  // === 📤 REQUÊTES SERVEUR ===
  
  async sendRequest(messageType, data = null) {
    if (this.systemState !== 'READY') {
      console.warn(`⚠️ [QuestManager] Requête ignorée - État: ${this.systemState}`);
      return false;
    }
    
    // ✅ PRIORISER NetworkManager si disponible
    if (this.networkManager && typeof this.networkManager.sendMessage === 'function') {
      console.log(`📤 [QuestManager] Envoi via NetworkManager: ${messageType}`, data);
      
      try {
        this.networkManager.sendMessage(messageType, data);
        return true;
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur NetworkManager:`, error);
        // Fallback vers gameRoom
      }
    }
    
    // Fallback GameRoom direct
    if (!this.gameRoom || typeof this.gameRoom.send !== 'function') {
      console.error('❌ [QuestManager] GameRoom non disponible');
      return false;
    }
    
    console.log(`📤 [QuestManager] Envoi direct GameRoom: ${messageType}`, data);
    
    try {
      this.gameRoom.send(messageType, data);
      return true;
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur envoi:`, error);
      return false;
    }
  }
  
  requestInitialData() {
    console.log('📤 [QuestManager] Demande données initiales...');
    this.sendRequest("getActiveQuests");
    this.sendRequest("clientIntroReady");
  }
  
  requestQuestData() {
    return this.sendRequest("getActiveQuests");
  }
  
  requestAvailableQuests() {
    return this.sendRequest("getAvailableQuests");
  }
  
  startQuest(questId) {
    console.log(`🎯 [QuestManager] Démarrage quête: ${questId}`);
    return this.sendRequest("startQuest", { questId });
  }
  
  // === 🗣️ INTERACTION NPC ULTRA-SIMPLE ===
  
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] === INTERACTION NPC ===');
    console.log('📊 Data:', data);
    
    // === VÉRIFICATION ÉTAT SIMPLE ===
    if (!this.canProcessInteraction()) {
      return 'BLOCKED';
    }
    
    if (!data) {
      console.warn('⚠️ [QuestManager] Données nulles');
      return 'INVALID_DATA';
    }
    
    // === TRAITEMENT SELON TYPE ===
    if (data.type === 'questGiver') {
      console.log('🎁 [QuestManager] Quest Giver');
      
      if (data.availableQuests && Array.isArray(data.availableQuests)) {
        console.log(`✅ [QuestManager] ${data.availableQuests.length} quêtes reçues`);
        this.showQuestSelectionDialog('Choisir une quête', data.availableQuests);
        return 'QUESTS_SHOWN';
      } else {
        console.log('📤 [QuestManager] Demande quêtes au serveur...');
        this.requestAvailableQuests();
        return 'REQUESTING_QUESTS';
      }
    }
    
    if (data.type === 'questComplete') {
      console.log('✅ [QuestManager] Quest Complete');
      this.setDialogueState('SHOWING_COMPLETION');
      
      // Afficher dialogue de complétion
      this.showNotification('Quête terminée ! Félicitations !', 'success');
      
      // Programmer fermeture dialogue
      setTimeout(() => this.setDialogueState('NONE'), 3000);
      return 'QUEST_COMPLETED';
    }
    
    console.log('ℹ️ [QuestManager] Type non-quest ou format non reconnu');
    return 'NO_QUEST';
  }
  
  // === 📊 HANDLERS DONNÉES ===
  
  handleActiveQuestsReceived(data) {
    console.log('📊 [QuestManager] Quêtes actives reçues:', data);
    
    try {
      let questArray = [];
      
      if (Array.isArray(data)) {
        questArray = data;
      } else if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      }
      
      this.activeQuests = questArray.filter(quest => quest && quest.id);
      
      console.log(`📊 [QuestManager] ${this.activeQuests.length} quêtes actives`);
      
      this.calculateStats();
      this.triggerCallbacks();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes actives:', error);
    }
  }
  
  handleAvailableQuestsReceived(data) {
    console.log('📊 [QuestManager] Quêtes disponibles reçues:', data);
    
    try {
      let questArray = [];
      
      if (Array.isArray(data)) {
        questArray = data;
      } else if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      }
      
      this.availableQuests = questArray.filter(quest => quest && quest.id);
      
      console.log(`📊 [QuestManager] ${this.availableQuests.length} quêtes disponibles`);
      
      // ✅ NOUVEAU: Si on était en attente de quêtes, les afficher maintenant
      if (this.dialogueState === 'NONE' && this.availableQuests.length > 0) {
        console.log('🎭 [QuestManager] Affichage quêtes disponibles reçues');
        this.showQuestSelectionDialog('Quêtes disponibles', this.availableQuests);
      }
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes disponibles:', error);
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestManager] Résultat démarrage:', data);
    
    if (data && data.success) {
      this.showNotification(`Quête "${data.quest?.name || 'Inconnue'}" acceptée !`, 'success');
      this.triggerCallback('onQuestStarted', data.quest);
      setTimeout(() => this.requestQuestData(), 500);
    } else {
      this.showNotification(data?.message || "Impossible de démarrer cette quête", 'error');
    }
    
    // === FERMER LE DIALOGUE ===
    this.setDialogueState('NONE');
  }
  
  handleQuestGranted(data) {
    console.log('🎁 [QuestManager] Quête accordée:', data);
    this.showNotification(`Nouvelle quête : ${data?.questName || 'Inconnue'} !`, 'success');
    this.triggerCallback('onQuestStarted', {
      id: data?.questId,
      name: data?.questName,
      granted: true
    });
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestProgressUpdate(data) {
    console.log('📈 [QuestManager] Progression:', data);
    
    if (!Array.isArray(data)) return;
    
    data.forEach(result => {
      if (result.questCompleted) {
        this.triggerCallback('onQuestCompleted', result);
      } else {
        this.triggerCallback('onQuestProgress', result);
      }
      
      if (result.objectiveCompleted) {
        this.showNotification(`Objectif complété : ${result.objectiveName}`, 'success');
      } else if (result.questCompleted) {
        this.showNotification(`Quête terminée : ${result.questName} !`, 'success');
      }
    });
    
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestCompleted(data) {
    console.log('🎉 [QuestManager] Quête terminée:', data);
    this.showNotification(data?.message || "Félicitations ! Quête terminée !", 'success');
    this.triggerCallback('onQuestCompleted', data);
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  // === ✅ NOUVEAU: HANDLER UNIFIÉ POUR SERVEUR ===
  
  handleServerResponse(responseData) {
    console.log('📨 [QuestManager] === RÉPONSE SERVEUR UNIFIÉE ===');
    console.log('📊 Type:', responseData.type);
    console.log('📊 Data:', responseData);
    
    // Arrêter processing si actif
    this.stopProcessing();
    
    switch (responseData.type) {
      case 'questGiver':
        this.handleQuestGiverResponse(responseData);
        break;
        
      case 'questComplete':
        this.handleQuestCompleteResponse(responseData);
        break;
        
      case 'quest':
        this.handleGenericQuestResponse(responseData);
        break;
        
      default:
        console.warn('⚠️ [QuestManager] Type de réponse non géré:', responseData.type);
        this.handleGenericQuestResponse(responseData);
    }
  }
  
  handleQuestGiverResponse(data) {
    console.log('🎁 [QuestManager] Réponse Quest Giver');
    
    if (data.availableQuests && Array.isArray(data.availableQuests)) {
      console.log(`✅ [QuestManager] ${data.availableQuests.length} quêtes reçues`);
      this.showQuestSelectionDialog('Choisir une quête', data.availableQuests);
    } else if (data.message) {
      this.showNotification(data.message, 'info');
    }
  }
  
  handleQuestCompleteResponse(data) {
    console.log('✅ [QuestManager] Réponse Quest Complete');
    
    this.setDialogueState('SHOWING_COMPLETION');
    this.showNotification(data.message || 'Quête terminée !', 'success');
    
    if (data.rewards) {
      console.log('🎁 [QuestManager] Récompenses:', data.rewards);
    }
    
    setTimeout(() => this.setDialogueState('NONE'), 3000);
  }
  
  handleGenericQuestResponse(data) {
    console.log('📝 [QuestManager] Réponse quest générique');
    
    if (data.message) {
      this.showNotification(data.message, 'info');
    }
    
    if (data.questStarted) {
      this.triggerCallback('onQuestStarted', data);
    }
    
    if (data.questCompleted) {
      this.triggerCallback('onQuestCompleted', data);
    }
  }
  
  stopProcessing() {
    // Méthode pour compatibilité avec InteractionNpcManager
    // QuestManager n'a pas de processing au sens strict
    console.log('✅ [QuestManager] Stop processing (compat)');
  }
  
  // === 🎭 DIALOGUES ===
  
  showQuestSelectionDialog(title, quests) {
    console.log('💬 [QuestManager] Dialogue sélection:', title, quests);
    
    // === ÉTAT DIALOGUE ACTIF ===
    this.setDialogueState('SHOWING_QUEST_SELECTION');
    
    if (!this.questUI || !this.questUI.showQuestDialog) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      
      // === FERMER LE DIALOGUE ===
      this.setDialogueState('NONE');
      
      // Fallback: démarrer automatiquement la première quête
      if (quests.length === 1) {
        this.startQuest(quests[0].id);
      } else if (quests.length > 1) {
        // Afficher une sélection simple
        this.showSimpleQuestSelection(title, quests);
      }
      return true;
    }
    
    this.questUI.showQuestDialog(title, quests, (selectedQuestId) => {
      console.log('✅ [QuestManager] Quête sélectionnée:', selectedQuestId);
      
      // === FERMER LE DIALOGUE AVANT DE DÉMARRER ===
      this.setDialogueState('NONE');
      
      if (selectedQuestId) {
        this.startQuest(selectedQuestId);
      }
    });
    
    return true;
  }
  
  // ✅ NOUVEAU: Fallback pour sélection simple
  showSimpleQuestSelection(title, quests) {
    console.log('📋 [QuestManager] Sélection simple fallback');
    
    const questList = quests.map((quest, index) => 
      `${index + 1}. ${quest.name || 'Quête sans nom'}`
    ).join('\n');
    
    this.showNotification(`${title}:\n${questList}\n(Première quête sélectionnée automatiquement)`, 'info');
    
    // Auto-select première quête après un délai
    setTimeout(() => {
      if (quests.length > 0) {
        this.startQuest(quests[0].id);
      }
    }, 2000);
  }
  
  // === 📊 STATS ET CALLBACKS ===
  
  calculateStats() {
    this.questStats.totalActive = this.activeQuests.length;
    this.questStats.newQuests = this.activeQuests.filter(q => q.isNew).length;
    this.questStats.readyToComplete = this.activeQuests.filter(q => 
      q.status === 'readyToComplete' || q.currentStepIndex >= (q.steps?.length || 0)
    ).length;
  }
  
  triggerCallbacks() {
    this.triggerCallback('onQuestUpdate', this.activeQuests);
    this.triggerCallback('onStatsUpdate', this.questStats);
  }
  
  triggerCallback(callbackName, data) {
    const callback = this[callbackName];
    if (callback && typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur callback ${callbackName}:`, error);
      }
    }
  }
  
  // === 🔗 CONNEXIONS ===
  
  connectQuestUI(questUI) {
    console.log('🔗 [QuestManager] Connexion QuestUI');
    this.questUI = questUI;
    
    if (this.activeQuests.length > 0 && questUI.updateQuestData) {
      questUI.updateQuestData(this.activeQuests, 'active');
    }
  }
  
  // === 🔧 UTILITAIRES ===
  
  showNotification(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000 });
    } else {
      console.log(`📢 [QuestManager] ${type.toUpperCase()}: ${message}`);
    }
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // === 📖 API PUBLIQUE ===
  
  isReady() {
    return this.systemState === 'READY' && this.initialized;
  }
  
  getState() {
    return {
      system: this.systemState,
      dialogue: this.dialogueState,
      initialized: this.initialized
    };
  }
  
  getActiveQuests() {
    return [...this.activeQuests];
  }
  
  getQuestStats() {
    return { ...this.questStats };
  }
  
  hasActiveQuests() {
    return this.activeQuests.length > 0;
  }
  
  // === ✅ NOUVEAU: DEBUG NETWORKMANAGER ===
  
  debugNetworkManagerConnection() {
    return {
      hasNetworkManager: !!this.networkManager,
      networkManagerMethods: this.networkManager ? {
        hasOnNpcInteraction: !!(this.networkManager.onNpcInteraction),
        hasSendMessage: !!(this.networkManager.sendMessage),
        hasGetSessionId: !!(this.networkManager.getSessionId),
        isConnected: this.networkManager.isConnected || false
      } : null,
      globalNetworkManager: !!window.globalNetworkManager
    };
  }
  
  getDebugInfo() {
    return {
      systemState: this.systemState,
      dialogueState: this.dialogueState,
      initialized: this.initialized,
      questCount: this.activeQuests.length,
      availableQuestCount: this.availableQuests.length,
      hasGameRoom: !!this.gameRoom,
      hasQuestUI: !!this.questUI,
      canProcessInteraction: this.canProcessInteraction(),
      networkManagerConnection: this.debugNetworkManagerConnection()
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestManager] Destruction...');
    
    this.setState('UNINITIALIZED', 'Destruction');
    this.setDialogueState('NONE');
    
    // Reset callbacks
    this.onQuestUpdate = null;
    this.onQuestStarted = null;
    this.onQuestCompleted = null;
    this.onQuestProgress = null;
    this.onStatsUpdate = null;
    
    // Reset données
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    
    // Reset connexions
    this.gameRoom = null;
    this.questUI = null;
    this.networkManager = null; // ✅ NOUVEAU
    
    // Reset état
    this.initialized = false;
    
    console.log('✅ [QuestManager] Détruit');
  }
}

export default QuestManager;

console.log(`
📖 === QUEST MANAGER AVEC NETWORKMANAGER ===

✅ NOUVELLES INTÉGRATIONS:
1. connectNetworkManager() - Connexion automatique
2. handleNetworkManagerResponse() - Handler unifié
3. sendRequest() via NetworkManager en priorité
4. isQuestRelatedResponse() - Filtrage intelligent
5. Fallback simple quest selection si pas d'UI

🔗 FLUX NETWORKMANAGER:
NetworkManager.onNpcInteraction → QuestManager.handleNetworkManagerResponse
→ QuestManager.handleServerResponse → Actions spécialisées

🚫 PROTECTION ANTI-BOUCLES:
• canProcessInteraction() = false si dialogue actif
• setDialogueState('NONE') après chaque action
• Pas de callback qui re-trigger dans les handlers

✅ QUEST MANAGER PRÊT POUR L'INTÉGRATION !
`);
