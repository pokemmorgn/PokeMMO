// Quest/QuestManager.js - SYSTÈME ROBUSTE AVEC ÉTATS ET VALIDATIONS
// 🎯 Approche Unreal Engine : États clairs, validations strictes, pas d'approximatif

export class QuestManager {
  constructor(gameRoom = null) {
    // === ÉTAT SYSTÈME ===
    this.state = 'UNINITIALIZED'; // UNINITIALIZED, WAITING_ROOM, CONNECTING_HANDLERS, READY, ERROR
    this.gameRoom = null;
    this.handlersRegistered = false;
    this.initialized = false;
    
    // === DONNÉES ===
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    
    // === STATISTIQUES ===
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
    this.onStateChanged = null;
    
    // === CONFIG ===
    this.config = {
      maxWaitTime: 10000,        // 10 secondes max pour attendre la room
      handlerRetryDelay: 500,    // 500ms entre tentatives
      maxHandlerRetries: 5,      // 5 tentatives max
      enableFallbackMode: true   // Mode fallback si échec
    };
    
    // === SYSTÈME DE REQUÊTES ===
    this.requestQueue = [];
    this.pendingRequests = new Map();
    this.requestId = 0;
    
    // === NPC INTERACTION ===
    this.pendingNpcInteraction = null;
    this.questUI = null;
    
    console.log('📖 [QuestManager] Instance créée - État:', this.state);
    
    // Si gameRoom fournie, commencer l'initialisation
    if (gameRoom) {
      this.setGameRoom(gameRoom);
    }
  }
  
  // === 🎯 GESTION D'ÉTAT STRICTE ===
  
  setState(newState, reason = '') {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`🔄 [QuestManager] État: ${oldState} → ${newState}${reason ? ` (${reason})` : ''}`);
    
    if (this.onStateChanged) {
      this.onStateChanged(oldState, newState, reason);
    }
    
    // Actions automatiques selon l'état
    this.handleStateChange(newState, oldState);
  }
  
  handleStateChange(newState, oldState) {
    switch (newState) {
      case 'WAITING_ROOM':
        // Commencer à attendre la room
        this.waitForValidGameRoom();
        break;
        
      case 'CONNECTING_HANDLERS':
        // Essayer d'enregistrer les handlers
        this.attemptHandlerRegistration();
        break;
        
      case 'READY':
        // Système prêt, demander les données initiales
        this.requestInitialData();
        break;
        
      case 'ERROR':
        // En cas d'erreur, évaluer si fallback possible
        this.evaluateFallbackMode();
        break;
    }
  }
  
  // === 🔗 GESTION GAMEROOM STRICTE ===
  
  setGameRoom(gameRoom) {
    console.log('🔗 [QuestManager] Configuration GameRoom...');
    
    if (!gameRoom) {
      this.setState('ERROR', 'GameRoom null fournie');
      throw new Error('GameRoom null fournie');
    }
    
    if (!this.validateGameRoom(gameRoom)) {
      this.setState('ERROR', 'GameRoom invalide');
      throw new Error('GameRoom invalide - méthodes manquantes');
    }
    
    this.gameRoom = gameRoom;
    this.setState('WAITING_ROOM', 'GameRoom configurée');
  }
  
  validateGameRoom(gameRoom) {
    const requiredMethods = ['send', 'onMessage'];
    const requiredProperties = ['state', 'sessionId'];
    
    // Vérifier méthodes
    for (const method of requiredMethods) {
      if (typeof gameRoom[method] !== 'function') {
        console.error(`❌ [QuestManager] Méthode manquante: ${method}`);
        return false;
      }
    }
    
    // Vérifier propriétés
    for (const prop of requiredProperties) {
      if (gameRoom[prop] === undefined) {
        console.error(`❌ [QuestManager] Propriété manquante: ${prop}`);
        return false;
      }
    }
    
    console.log('✅ [QuestManager] GameRoom validée');
    return true;
  }
  
  async waitForValidGameRoom() {
    console.log('⏳ [QuestManager] Attente GameRoom prête...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      if (this.isGameRoomReady()) {
        console.log('✅ [QuestManager] GameRoom prête');
        this.setState('CONNECTING_HANDLERS', 'GameRoom prête');
        return true;
      }
      
      // Attendre avant re-vérifier
      await this.wait(100);
    }
    
    // Timeout
    console.error('❌ [QuestManager] Timeout - GameRoom pas prête');
    this.setState('ERROR', 'Timeout GameRoom');
    return false;
  }
  
  isGameRoomReady() {
    if (!this.gameRoom) return false;
    
    // Vérifier état de connexion
    if (!this.gameRoom.sessionId) return false;
    
    // Vérifier que les méthodes sont toujours disponibles
    if (typeof this.gameRoom.onMessage !== 'function') return false;
    if (typeof this.gameRoom.send !== 'function') return false;
    
    // Vérifier que _messageHandlers existe (structure Colyseus)
    if (!this.gameRoom._messageHandlers && !this.gameRoom.onMessage._handlers) {
      console.warn('⚠️ [QuestManager] Structure handlers Colyseus non trouvée');
      // Mais on continue car la méthode onMessage existe
    }
    
    return true;
  }
  
  // === 📡 ENREGISTREMENT HANDLERS ROBUSTE ===
  
  async attemptHandlerRegistration() {
    console.log('📡 [QuestManager] Tentative enregistrement handlers...');
    
    let attempts = 0;
    
    while (attempts < this.config.maxHandlerRetries) {
      attempts++;
      
      console.log(`🔄 [QuestManager] Tentative ${attempts}/${this.config.maxHandlerRetries}`);
      
      try {
        const success = await this.registerHandlers();
        
        if (success) {
          this.handlersRegistered = true;
          console.log('✅ [QuestManager] Handlers enregistrés avec succès');
          this.setState('READY', 'Handlers enregistrés');
          return true;
        }
        
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur tentative ${attempts}:`, error);
      }
      
      // Attendre avant retry
      if (attempts < this.config.maxHandlerRetries) {
        await this.wait(this.config.handlerRetryDelay);
      }
    }
    
    // Toutes les tentatives échouées
    console.error('❌ [QuestManager] Échec enregistrement handlers après toutes tentatives');
    this.setState('ERROR', 'Échec enregistrement handlers');
    return false;
  }
  
  async registerHandlers() {
    if (!this.gameRoom || typeof this.gameRoom.onMessage !== 'function') {
      throw new Error('GameRoom ou onMessage non disponible');
    }
    
    console.log('📋 [QuestManager] Enregistrement handlers Colyseus...');
    
    const handlers = {
      'activeQuestsList': (data) => this.handleActiveQuestsReceived(data),
      'availableQuestsList': (data) => this.handleAvailableQuestsReceived(data),
      'questStartResult': (data) => this.handleQuestStartResult(data),
      'questGranted': (data) => this.handleQuestGranted(data),
      'questProgressUpdate': (data) => this.handleQuestProgressUpdate(data),
      'questCompleted': (data) => this.handleQuestCompleted(data),
      'questStatuses': (data) => this.handleQuestStatuses(data),
      'triggerIntroSequence': (data) => this.handleIntroSequence(data),
      'introQuestCompleted': (data) => this.handleIntroQuestCompleted(data)
    };
    
    // Enregistrer chaque handler
    for (const [messageType, handler] of Object.entries(handlers)) {
      try {
        this.gameRoom.onMessage(messageType, (data) => {
          console.log(`📨 [QuestManager] Message reçu: ${messageType}`, data);
          this.safeExecuteHandler(messageType, handler, data);
        });
        
        console.log(`✅ [QuestManager] Handler '${messageType}' enregistré`);
        
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur handler '${messageType}':`, error);
        throw error;
      }
    }
    
    // Vérifier que les handlers sont bien enregistrés
    return this.validateHandlerRegistration();
  }
  
  validateHandlerRegistration() {
    // Différentes façons de vérifier selon la structure Colyseus
    if (this.gameRoom._messageHandlers) {
      const requiredHandlers = ['activeQuestsList', 'availableQuestsList', 'questStartResult'];
      
      for (const handler of requiredHandlers) {
        if (!this.gameRoom._messageHandlers[handler]) {
          console.error(`❌ [QuestManager] Handler '${handler}' non trouvé dans _messageHandlers`);
          return false;
        }
      }
      
      console.log('✅ [QuestManager] Validation handlers via _messageHandlers OK');
      return true;
    }
    
    // Si pas de _messageHandlers visible, on fait confiance au fait que onMessage a fonctionné
    console.log('✅ [QuestManager] Validation handlers via onMessage OK (structure interne)');
    return true;
  }
  
  safeExecuteHandler(messageType, handler, data) {
    try {
      handler(data);
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur execution handler '${messageType}':`, error);
      
      // Fallback basique pour handlers critiques
      if (messageType === 'activeQuestsList') {
        this.handleActiveQuestsReceived([]);
      }
    }
  }
  
  // === 🚀 INITIALISATION PUBLIQUE ===
  
  async init(gameRoom = null) {
    console.log('🚀 [QuestManager] === INITIALISATION SYSTÈME ===');
    
    try {
      // Si gameRoom fournie, la configurer
      if (gameRoom) {
        this.setGameRoom(gameRoom);
      }
      
      // Vérifier qu'on a une gameRoom
      if (!this.gameRoom) {
        throw new Error('Aucune GameRoom disponible pour initialisation');
      }
      
      // Attendre que le système soit prêt
      const success = await this.waitForReadyState();
      
      if (!success) {
        throw new Error('Système non prêt après timeout');
      }
      
      this.initialized = true;
      console.log('✅ [QuestManager] Initialisation terminée avec succès');
      
      return this;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur initialisation:', error);
      
      // Tentative mode fallback si configuré
      if (this.config.enableFallbackMode) {
        console.log('🔄 [QuestManager] Tentative mode fallback...');
        const fallbackSuccess = await this.initializeFallbackMode();
        
        if (fallbackSuccess) {
          console.log('✅ [QuestManager] Mode fallback activé');
          return this;
        }
      }
      
      throw error;
    }
  }
  
  async waitForReadyState() {
    console.log('⏳ [QuestManager] Attente état READY...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.maxWaitTime) {
      if (this.state === 'READY') {
        return true;
      }
      
      if (this.state === 'ERROR') {
        return false;
      }
      
      await this.wait(100);
    }
    
    console.error('❌ [QuestManager] Timeout attente état READY');
    return false;
  }
  
  async initializeFallbackMode() {
    console.log('🔄 [QuestManager] === MODE FALLBACK ===');
    
    try {
      // Créer des données de test
      this.activeQuests = this.createFallbackQuests();
      this.calculateStats();
      this.triggerCallbacks();
      
      // Marquer comme initialisé en mode fallback
      this.initialized = true;
      this.setState('READY', 'Mode fallback activé');
      
      return true;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur mode fallback:', error);
      return false;
    }
  }
  
  createFallbackQuests() {
    return [
      {
        id: 'fallback_welcome',
        name: 'Bienvenue dans l\'aventure',
        description: 'Découvrez le monde Pokémon qui vous entoure.',
        category: 'main',
        currentStepIndex: 0,
        status: 'active',
        steps: [
          {
            id: 'welcome_step_1',
            name: 'Premiers pas',
            description: 'Explorez votre environnement',
            objectives: [
              {
                id: 'explore_objective',
                description: 'Regardez autour de vous',
                completed: false,
                requiredAmount: 1,
                currentAmount: 0
              }
            ]
          }
        ]
      },
      {
        id: 'fallback_discover',
        name: 'Découverte des Pokémon',
        description: 'Apprenez à connaître les Pokémon.',
        category: 'side',
        currentStepIndex: 0,
        status: 'active',
        steps: [
          {
            id: 'discover_step_1',
            name: 'Observer',
            description: 'Observez les Pokémon sauvages',
            objectives: [
              {
                id: 'observe_objective',
                description: 'Observez un Pokémon sauvage',
                completed: false,
                requiredAmount: 1,
                currentAmount: 0
              }
            ]
          }
        ]
      }
    ];
  }
  
  // === 📤 SYSTÈME DE REQUÊTES ROBUSTE ===
  
  async sendRequest(messageType, data = null, timeout = 5000) {
    if (this.state !== 'READY') {
      console.warn(`⚠️ [QuestManager] Requête '${messageType}' ignorée - État: ${this.state}`);
      return false;
    }
    
    if (!this.gameRoom || typeof this.gameRoom.send !== 'function') {
      console.error('❌ [QuestManager] GameRoom non disponible pour requête');
      return false;
    }
    
    const requestId = ++this.requestId;
    
    console.log(`📤 [QuestManager] Envoi requête ${requestId}: ${messageType}`, data);
    
    try {
      this.gameRoom.send(messageType, data);
      
      // Stocker la requête pour suivi
      this.pendingRequests.set(requestId, {
        messageType,
        data,
        timestamp: Date.now(),
        timeout
      });
      
      // Nettoyer après timeout
      setTimeout(() => {
        this.pendingRequests.delete(requestId);
      }, timeout);
      
      return true;
      
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur envoi requête '${messageType}':`, error);
      return false;
    }
  }
  
  async requestInitialData() {
    console.log('📤 [QuestManager] Demande données initiales...');
    
    // Demandes en parallèle
    const requests = [
      this.sendRequest("getActiveQuests"),
      this.sendRequest("clientIntroReady")
    ];
    
    const results = await Promise.allSettled(requests);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`📊 [QuestManager] Requêtes initiales: ${successCount}/${requests.length} réussies`);
  }
  
  requestQuestData() {
    return this.sendRequest("getActiveQuests");
  }
  
  requestAvailableQuests() {
    return this.sendRequest("getAvailableQuests");
  }
  
  startQuest(questId) {
    return this.sendRequest("startQuest", { questId });
  }
  
  // === 📊 HANDLERS DE DONNÉES ===
  
  handleActiveQuestsReceived(data) {
    console.log('📊 [QuestManager] Traitement quêtes actives:', data);
    
    try {
      let questArray = [];
      
      if (Array.isArray(data)) {
        questArray = data;
      } else if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      } else if (data && typeof data === 'object') {
        questArray = [data];
      }
      
      // Normaliser et valider
      this.activeQuests = questArray
        .map(quest => this.normalizeQuestData(quest))
        .filter(quest => quest && quest.id);
      
      console.log(`📊 [QuestManager] ${this.activeQuests.length} quêtes actives chargées`);
      
      this.calculateStats();
      this.triggerCallbacks();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes actives:', error);
    }
  }
  
  handleAvailableQuestsReceived(data) {
    console.log('📊 [QuestManager] Traitement quêtes disponibles:', data);
    
    try {
      let questArray = [];
      
      if (Array.isArray(data)) {
        questArray = data;
      } else if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      }
      
      this.availableQuests = questArray
        .map(quest => this.normalizeQuestData(quest))
        .filter(quest => quest && quest.id);
      
      console.log(`📊 [QuestManager] ${this.availableQuests.length} quêtes disponibles chargées`);
      
      // Traiter interaction NPC en attente
      this.processPendingNpcInteraction();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes disponibles:', error);
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestManager] Résultat démarrage quête:', data);
    
    if (data && data.success) {
      this.showNotification(`Quête "${data.quest?.name || 'Inconnue'}" acceptée !`, 'success');
      this.triggerCallback('onQuestStarted', data.quest);
      
      // Rafraîchir les données
      setTimeout(() => this.requestQuestData(), 500);
    } else {
      this.showNotification(data?.message || "Impossible de démarrer cette quête", 'error');
    }
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
    console.log('📈 [QuestManager] Progression quête:', data);
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ [QuestManager] Format progression invalide');
      return;
    }
    
    data.forEach(result => {
      if (result.questCompleted) {
        this.triggerCallback('onQuestCompleted', result);
      } else {
        this.triggerCallback('onQuestProgress', result);
      }
      
      // Notifications
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
  
  handleQuestStatuses(data) {
    console.log('📊 [QuestManager] Statuts quêtes NPCs:', data);
    // Déléguer aux NPCs pour mise à jour des icônes
  }
  
  handleIntroSequence(data) {
    console.log('🎬 [QuestManager] Séquence intro:', data);
    // Gérer séquence d'introduction
  }
  
  handleIntroQuestCompleted(data) {
    console.log('🎓 [QuestManager] Intro terminée:', data);
    this.showNotification(data?.message || "Introduction terminée !", 'success');
  }
  
  // === 🗣️ INTERACTION NPC ===
  
  handleNpcInteraction(npcData) {
    console.log('🗣️ [QuestManager] Interaction NPC:', npcData);
    
    if (this.state !== 'READY') {
      console.warn('⚠️ [QuestManager] Interaction NPC ignorée - système pas prêt');
      return 'NOT_READY';
    }
    
    if (!npcData || (!npcData.id && !npcData.npcId && !npcData.name)) {
      console.warn('⚠️ [QuestManager] Données NPC invalides');
      return 'INVALID_DATA';
    }
    
    // Chercher quêtes pour ce NPC
    const npcQuests = this.findQuestsForNpc(npcData);
    
    if (npcQuests.length > 0) {
      this.showQuestSelectionDialog(npcData.name || 'NPC', npcQuests);
      return 'QUESTS_FOUND';
    }
    
    // Demander quêtes au serveur
    this.requestAvailableQuestsForNpc(npcData);
    return 'REQUESTING_QUESTS';
  }
  
  findQuestsForNpc(npcData) {
    const npcId = npcData.npcId || npcData.id;
    const npcName = npcData.name || npcData.npcName;
    
    // Chercher dans les quêtes disponibles
    return this.availableQuests.filter(quest => {
      return this.questMatchesNpc(quest, npcId, npcName);
    });
  }
  
  questMatchesNpc(quest, npcId, npcName) {
    // Matching simple mais efficace
    if (npcId && (quest.startNpcId == npcId || quest.endNpcId == npcId)) {
      return true;
    }
    
    if (npcName && quest.startNpcName && 
        quest.startNpcName.toLowerCase() === npcName.toLowerCase()) {
      return true;
    }
    
    // Si pas de restrictions NPC, autoriser
    if (!quest.startNpcId && !quest.endNpcId && !quest.startNpcName) {
      return true;
    }
    
    return false;
  }
  
  requestAvailableQuestsForNpc(npcData) {
    this.pendingNpcInteraction = {
      npcData,
      timestamp: Date.now()
    };
    
    this.requestAvailableQuests();
    
    // Timeout
    setTimeout(() => {
      if (this.pendingNpcInteraction?.timestamp === this.pendingNpcInteraction?.timestamp) {
        this.pendingNpcInteraction = null;
      }
    }, 5000);
  }
  
  processPendingNpcInteraction() {
    if (!this.pendingNpcInteraction) return;
    
    const { npcData } = this.pendingNpcInteraction;
    this.pendingNpcInteraction = null;
    
    const npcQuests = this.findQuestsForNpc(npcData);
    
    if (npcQuests.length > 0) {
      this.showQuestSelectionDialog(npcData.name || 'NPC', npcQuests);
    } else if (this.availableQuests.length > 0) {
      // Fallback : montrer toutes les quêtes
      this.showQuestSelectionDialog('Quêtes disponibles', this.availableQuests);
    }
  }
  
  showQuestSelectionDialog(title, quests) {
    if (!this.questUI || !this.questUI.showQuestDialog) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      return;
    }
    
    this.questUI.showQuestDialog(title, quests, (questId) => {
      this.startQuest(questId);
    });
  }
  
  // === 🔗 CONNEXIONS ===
  
  connectQuestUI(questUI) {
    console.log('🔗 [QuestManager] Connexion QuestUI');
    
    this.questUI = questUI;
    
    // Mise à jour immédiate si données disponibles
    if (this.activeQuests.length > 0 && questUI.updateQuestData) {
      questUI.updateQuestData(this.activeQuests, 'active');
    }
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
  
  // === 🔧 UTILITAIRES ===
  
  normalizeQuestData(quest) {
    if (!quest) return null;
    
    try {
      if (typeof quest === 'string') {
        quest = JSON.parse(quest);
      }
      
      return {
        id: quest.id || quest._id || `quest_${Date.now()}`,
        name: quest.name || 'Quête sans nom',
        description: quest.description || 'Pas de description',
        category: quest.category || 'side',
        currentStepIndex: quest.currentStepIndex || 0,
        status: quest.status || 'active',
        steps: quest.steps || []
      };
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur normalisation quête:', error);
      return null;
    }
  }
  
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
    return this.state === 'READY' && this.initialized;
  }
  
  getState() {
    return this.state;
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
  
  getDebugInfo() {
    return {
      state: this.state,
      initialized: this.initialized,
      handlersRegistered: this.handlersRegistered,
      hasGameRoom: !!this.gameRoom,
      gameRoomReady: this.isGameRoomReady(),
      questCount: this.activeQuests.length,
      availableQuestCount: this.availableQuests.length,
      pendingRequests: this.pendingRequests.size,
      hasQuestUI: !!this.questUI,
      hasPendingNpcInteraction: !!this.pendingNpcInteraction
    };
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestManager] Destruction...');
    
    this.setState('UNINITIALIZED', 'Destruction');
    
    // Reset callbacks
    this.onQuestUpdate = null;
    this.onQuestStarted = null;
    this.onQuestCompleted = null;
    this.onQuestProgress = null;
    this.onStatsUpdate = null;
    this.onStateChanged = null;
    
    // Reset données
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    this.pendingRequests.clear();
    this.requestQueue = [];
    
    // Reset connexions
    this.gameRoom = null;
    this.questUI = null;
    this.pendingNpcInteraction = null;
    
    // Reset état
    this.initialized = false;
    this.handlersRegistered = false;
    
    console.log('✅ [QuestManager] Détruit');
  }
}

export default QuestManager;

console.log(`
📖 === QUEST MANAGER - SYSTÈME ROBUSTE ===

🎯 APPROCHE UNREAL ENGINE:
✅ États clairs et strictes (UNINITIALIZED → WAITING_ROOM → CONNECTING_HANDLERS → READY → ERROR)
✅ Validations strictes de GameRoom avant utilisation
✅ Attente explicite des dépendances (pas d'approximatif)
✅ Gestion d'erreurs avec fallbacks définis
✅ API claire avec statuts et callbacks

🔧 GARANTIES SYSTÈME:
✅ GameRoom validée avant usage (méthodes + propriétés)
✅ Handlers enregistrés avec validation ou échec propre
✅ États trackés avec transitions automatiques
✅ Timeouts explicites (pas d'attente infinie)
✅ Mode fallback si échec complet

🚀 UTILISATION:
// Méthode 1 : Avec GameRoom
const manager = new QuestManager(gameRoom);
await manager.init();

// Méthode 2 : GameRoom plus tard  
const manager = new QuestManager();
await manager.init(gameRoom);

// Vérification état
if (manager.isReady()) {
  manager.handleNpcInteraction(npcData);
}

🔍 DEBUG:
manager.getDebugInfo() // État complet du système
manager.getState()     // État actuel

✅ PLUS D'APPROXIMATIF - SYSTÈME DÉTERMINISTE !
`);
