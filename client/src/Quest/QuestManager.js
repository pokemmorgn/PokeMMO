// Quest/QuestManager.js - FIX HANDLERS DUPLIQUÉS

export class QuestManager {
  constructor(gameRoom) {
    // État simple
    this.ready = false;
    this.initialized = false;
    this.handlersRegistered = false; // ✅ NOUVEAU: Flag pour éviter duplication
    
    // Données
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    
    // Stats
    this.questStats = {
      totalActive: 0,
      totalCompleted: 0,
      newQuests: 0,
      readyToComplete: 0
    };
    
    // Callbacks
    this.onQuestUpdate = null;
    this.onQuestStarted = null;
    this.onQuestCompleted = null;
    this.onQuestProgress = null;
    this.onStatsUpdate = null;
    
    // Connexions
    this.questUI = null;
    this.networkManager = null;
    this.gameRoom = null;
    
    // État interaction
    this.pendingQuestRequest = false;
    this.lastInteractionTime = 0;
    this.interactionCooldown = 1000;
    
    // ✅ NOUVEAU: Références des handlers pour nettoyage
    this.handlerRefs = new Map();
    
    console.log('📖 [QuestManager] Instance créée - Version simplifiée');
    
    if (gameRoom) {
      this.setGameRoom(gameRoom);
    }
  }
  
  // === 🚀 INITIALISATION SIMPLIFIÉE ===
  
  async init(gameRoom = null, networkManager = null) {
    try {
      console.log('🚀 [QuestManager] Initialisation simplifiée...');
      
      // 1. Configuration GameRoom
      if (gameRoom) {
        this.setGameRoom(gameRoom);
      }
      
      if (!this.gameRoom) {
        throw new Error('GameRoom requise');
      }
      
      // 2. Configuration NetworkManager  
      if (networkManager) {
        this.connectNetworkManager(networkManager);
      }
      
      // 3. Enregistrement handlers - SEULEMENT si pas déjà fait
      if (!this.handlersRegistered) {
        this.registerHandlers();
        this.handlersRegistered = true;
      } else {
        console.log('ℹ️ [QuestManager] Handlers déjà enregistrés, skip');
      }
      
      // 4. PRÊT IMMÉDIATEMENT
      this.ready = true;
      this.initialized = true;
      
      console.log('✅ [QuestManager] Prêt immédiatement !');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur init:', error);
      throw error;
    }
  }
  
  // === 🔗 CONFIGURATION GAMEROOM SIMPLE ===
  
  setGameRoom(gameRoom) {
    console.log('🔗 [QuestManager] Configuration GameRoom simple...');
    
    if (!gameRoom || typeof gameRoom.onMessage !== 'function') {
      throw new Error('GameRoom invalide');
    }
    
    this.gameRoom = gameRoom;
    console.log('✅ [QuestManager] GameRoom configurée');
  }
  
  // === 📡 ENREGISTREMENT HANDLERS AVEC NETTOYAGE ===
  
  registerHandlers() {
    if (!this.gameRoom) {
      console.error('❌ [QuestManager] Pas de GameRoom');
      return false;
    }
    
    console.log('📡 [QuestManager] Enregistrement handlers direct...');
    
    // ✅ NOUVEAU: Nettoyer les anciens handlers d'abord
    this.unregisterHandlers();
    
    try {
      // Créer et stocker les handlers
      const handlers = {
        "activeQuestsList": (data) => {
          console.log('📥 [QuestManager] Quêtes actives:', data);
          this.activeQuests = this.extractQuests(data);
          this.updateStats();
          this.triggerCallbacks();
        },

        "availableQuestsList": (data) => {
          console.log('📥 [QuestManager] Quêtes disponibles:', data);
          this.availableQuests = this.extractQuests(data);
          
          if (this.pendingQuestRequest && this.availableQuests.length > 0) {
            this.showQuestSelection();
          }
          this.pendingQuestRequest = false;
        },

        "questStartResult": (data) => {
          console.log('📥 [QuestManager] Résultat démarrage:', data);
          this.handleQuestStartResult(data);
        },

        "questProgressUpdate": (data) => {
          console.log('📥 [QuestManager] Progression:', data);
          this.handleQuestProgress(data);
        },

        "questStatuses": (data) => {
          console.log('📥 [QuestManager] Statuts:', data);
          this.handleQuestStatuses(data);
        }
      };
      
      // Enregistrer les handlers ET les stocker pour nettoyage
      Object.entries(handlers).forEach(([eventName, handler]) => {
        this.gameRoom.onMessage(eventName, handler);
        this.handlerRefs.set(eventName, handler);
      });
      
      console.log('✅ [QuestManager] Handlers enregistrés');
      return true;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handlers:', error);
      return false;
    }
  }
  
  // ✅ NOUVEAU: Méthode pour nettoyer les handlers
  unregisterHandlers() {
    if (!this.gameRoom || !this.handlerRefs.size) {
      return;
    }
    
    console.log('🧹 [QuestManager] Nettoyage anciens handlers...');
    
    // Si GameRoom a une méthode offMessage, l'utiliser
    if (typeof this.gameRoom.offMessage === 'function') {
      this.handlerRefs.forEach((handler, eventName) => {
        this.gameRoom.offMessage(eventName, handler);
      });
    }
    // Sinon, essayer de nettoyer manuellement
    else if (this.gameRoom._messageHandlers) {
      this.handlerRefs.forEach((handler, eventName) => {
        const handlers = this.gameRoom._messageHandlers.get(eventName);
        if (handlers && Array.isArray(handlers)) {
          const index = handlers.indexOf(handler);
          if (index !== -1) {
            handlers.splice(index, 1);
          }
        }
      });
    }
    
    this.handlerRefs.clear();
    console.log('✅ [QuestManager] Handlers nettoyés');
  }
  
  // === ✅ VÉRIFICATIONS SIMPLES ===
  
  isReady() {
    return this.ready && this.initialized && !!this.gameRoom;
  }
  
  canProcessInteraction() {
    if (!this.isReady()) {
      console.log('🚫 [QuestManager] Pas prêt');
      return false;
    }
    
    const now = Date.now();
    if (this.lastInteractionTime && (now - this.lastInteractionTime) < this.interactionCooldown) {
      console.log('🚫 [QuestManager] Cooldown actif');
      return false;
    }
    
    return true;
  }
  
  // === 📤 REQUÊTES SERVEUR SIMPLES ===
  
  sendRequest(messageType, data = null) {
    if (!this.isReady()) {
      console.warn(`⚠️ [QuestManager] Pas prêt pour: ${messageType}`);
      return false;
    }
    
    try {
      if (this.networkManager?.sendMessage) {
        console.log(`📤 [QuestManager] Via NetworkManager: ${messageType}`);
        this.networkManager.sendMessage(messageType, data);
      } else {
        console.log(`📤 [QuestManager] Via GameRoom: ${messageType}`);
        this.gameRoom.send(messageType, data);
      }
      return true;
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur envoi ${messageType}:`, error);
      return false;
    }
  }
  
  requestActiveQuests() {
    return this.sendRequest("getActiveQuests");
  }
  
  requestAvailableQuests() {
    this.pendingQuestRequest = true;
    return this.sendRequest("getAvailableQuests");
  }
  
  startQuest(questId) {
    console.log(`🎯 [QuestManager] Démarrage quête: ${questId}`);
    return this.sendRequest("startQuest", { questId });
  }
  
  // === 🗣️ INTERACTION NPC SIMPLE ===
  
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] Interaction NPC:', data);
    
    if (!this.canProcessInteraction()) {
      return 'BLOCKED';
    }
    
    this.lastInteractionTime = Date.now();
    
    if (!data || data.type !== 'questGiver') {
      return 'NO_QUEST';
    }
    
    // Quêtes fournies directement
    if (data.availableQuests?.length > 0) {
      this.showQuestDialog('Choisir une quête', data.availableQuests);
      return 'QUESTS_SHOWN';
    }
    
    // Demander quêtes au serveur
    if (!this.pendingQuestRequest) {
      this.requestAvailableQuests();
      return 'REQUESTING_QUESTS';
    }
    
    return 'ALREADY_REQUESTING';
  }
  
  // === 📊 GESTION DONNÉES SIMPLE ===
  
  extractQuests(data) {
    try {
      if (Array.isArray(data)) return data.filter(q => q?.id);
      if (data?.quests) return data.quests.filter(q => q?.id);
      if (data?.questList) return data.questList.filter(q => q?.id);
      return [];
    } catch (error) {
      console.error('❌ [QuestManager] Erreur extraction:', error);
      return [];
    }
  }
  
  updateStats() {
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
    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [QuestManager] Erreur callback ${callbackName}:`, error);
      }
    }
  }
  
  // === 📊 HANDLERS DONNÉES ===
  
  handleQuestStartResult(data) {
    if (data?.success) {
      this.showNotification(`Quête "${data.quest?.name || 'Inconnue'}" acceptée !`, 'success');
      this.triggerCallback('onQuestStarted', data.quest);
      setTimeout(() => this.requestActiveQuests(), 500);
    } else {
      this.showNotification(data?.message || "Impossible de démarrer cette quête", 'error');
    }
  }
  
  handleQuestProgress(data) {
    if (!Array.isArray(data)) return;
    
    data.forEach(result => {
      if (result.questCompleted) {
        this.triggerCallback('onQuestCompleted', result);
        this.showNotification(`Quête terminée : ${result.questName} !`, 'success');
      } else {
        this.triggerCallback('onQuestProgress', result);
        if (result.objectiveCompleted) {
          this.showNotification(`Objectif complété : ${result.objectiveName}`, 'success');
        }
      }
    });
    
    setTimeout(() => this.requestActiveQuests(), 500);
  }
  
  handleQuestStatuses(data) {
    try {
      if (data?.totalActive !== undefined) {
        this.questStats = {
          totalActive: data.totalActive || 0,
          totalCompleted: data.totalCompleted || 0,
          newQuests: data.newQuests || 0,
          readyToComplete: data.readyToComplete || 0
        };
        this.triggerCallback('onStatsUpdate', this.questStats);
      }
    } catch (error) {
      console.error('❌ [QuestManager] Erreur statuts:', error);
    }
  }
  
  // === 💬 DIALOGUES SIMPLE ===
  
  showQuestSelection() {
    if (this.availableQuests.length > 0) {
      this.showQuestDialog('Quêtes disponibles', this.availableQuests);
    }
  }
  
  showQuestDialog(title, quests) {
    if (!this.questUI?.showQuestDialog) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      // Auto-select première quête
      if (quests.length > 0) {
        setTimeout(() => this.startQuest(quests[0].id), 1000);
      }
      return;
    }
    
    this.questUI.showQuestDialog(title, quests, (selectedQuestId) => {
      if (selectedQuestId) {
        this.startQuest(selectedQuestId);
      }
    });
  }
  
  // === 🔗 CONNEXIONS SIMPLE ===
  
  connectNetworkManager(networkManager) {
    this.networkManager = networkManager;
    
    if (networkManager?.onNpcInteraction) {
      networkManager.onNpcInteraction((data) => {
        this.handleNetworkManagerResponse(data);
      });
      console.log('✅ [QuestManager] NetworkManager connecté');
    }
  }
  
  handleNetworkManagerResponse(data) {
    if (this.isQuestRelatedResponse(data)) {
      this.handleNpcInteraction(data);
    }
  }
  
  isQuestRelatedResponse(data) {
    return data?.type === 'questGiver' || 
           data?.availableQuests || 
           data?.questData !== undefined;
  }
  
  connectQuestUI(questUI) {
    console.log('🔗 [QuestManager] Connexion QuestUI');
    this.questUI = questUI;
    
    if (this.activeQuests.length > 0) {
      questUI.updateQuestData?.(this.activeQuests, 'active');
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
  
  // === 📖 API PUBLIQUE ===
  
  getActiveQuests() {
    return [...this.activeQuests];
  }
  
  getQuestStats() {
    return { ...this.questStats };
  }
  
  hasActiveQuests() {
    return this.activeQuests.length > 0;
  }
  
  // === 🧹 NETTOYAGE AMÉLIORÉ ===
  
  destroy() {
    console.log('🧹 [QuestManager] Destruction...');
    
    // ✅ NOUVEAU: Nettoyer les handlers
    this.unregisterHandlers();
    
    this.ready = false;
    this.initialized = false;
    this.handlersRegistered = false;
    
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
    this.networkManager = null;
    
    console.log('✅ [QuestManager] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  getDebugInfo() {
    return {
      ready: this.ready,
      initialized: this.initialized,
      handlersRegistered: this.handlersRegistered,
      questCount: this.activeQuests.length,
      availableQuestCount: this.availableQuests.length,
      hasGameRoom: !!this.gameRoom,
      hasQuestUI: !!this.questUI,
      hasNetworkManager: !!this.networkManager,
      pendingQuestRequest: this.pendingQuestRequest,
      lastInteractionTime: this.lastInteractionTime,
      canProcessInteraction: this.canProcessInteraction(),
      handlerRefsCount: this.handlerRefs.size
    };
  }
}
