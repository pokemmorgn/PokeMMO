// Quest/QuestManager.js - SYSTÈME D'ÉTATS SIMPLE COMME UNREAL ENGINE
// 🎯 État dialogue = TOUT BLOQUÉ. Simple et efficace.

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
    
    // === CONFIG ===
    this.config = {
      maxWaitTime: 10000,
      handlerRetryDelay: 500,
      maxHandlerRetries: 5
    };
    
    console.log('📖 [QuestManager] Instance créée - État simple');
    
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
  
  // === 🚀 INITIALISATION PUBLIQUE ===
  
  async init(gameRoom = null) {
    console.log('🚀 [QuestManager] Initialisation...');
    
    try {
      if (gameRoom) {
        this.setGameRoom(gameRoom);
      }
      
      if (!this.gameRoom) {
        throw new Error('Aucune GameRoom');
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
    
    if (!this.gameRoom || typeof this.gameRoom.send !== 'function') {
      console.error('❌ [QuestManager] GameRoom non disponible');
      return false;
    }
    
    console.log(`📤 [QuestManager] Envoi: ${messageType}`, data);
    
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
  
  getDebugInfo() {
    return {
      systemState: this.systemState,
      dialogueState: this.dialogueState,
      initialized: this.initialized,
      questCount: this.activeQuests.length,
      availableQuestCount: this.availableQuests.length,
      hasGameRoom: !!this.gameRoom,
      hasQuestUI: !!this.questUI,
      canProcessInteraction: this.canProcessInteraction()
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
    
    // Reset état
    this.initialized = false;
    
    console.log('✅ [QuestManager] Détruit');
  }
}

export default QuestManager;

console.log(`
📖 === QUEST MANAGER - ÉTAT MACHINE SIMPLE ===

🎯 COMME UNREAL ENGINE:
✅ État dialogue = TOUT BLOQUÉ
✅ canProcessInteraction() vérifie TOUT
✅ setDialogueState() contrôle les transitions
✅ Pas de boucles - une interaction = un traitement

🔧 ÉTATS SIMPLES:
• systemState: UNINITIALIZED → WAITING_ROOM → READY → ERROR
• dialogueState: NONE → SHOWING_QUEST_SELECTION → NONE

🚫 PROTECTION ANTI-BOUCLE:
• canProcessInteraction() = false si dialogue actif
• setDialogueState('NONE') après chaque action
• Pas de callback qui re-trigger

✅ SIMPLE ET EFFICACE !
`);
