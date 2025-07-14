// Quest/QuestManager.js - VERSION ULTRA-ROBUSTE COMPLÈTE
// 🎯 CORRECTIONS: Setup handlers immédiat + NPC matching + Fallbacks + Auto-réparation

export class QuestManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    
    // === DONNÉES LOCALES ===
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
    
    // === ÉTAT SYSTÈME ===
    this.initialized = false;
    this.questUI = null;
    this.lastDataRequest = 0;
    this.requestCooldown = 1000;
    
    // === ROBUSTESSE ===
    this.requestQueue = [];
    this.processingQueue = false;
    this.fallbackEnabled = true;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // === NPC INTERACTION CACHE ===
    this.pendingNpcInteraction = null;
    this.npcInteractionTimeout = 8000;
    this.interactionHistory = new Map();
    
    // === DÉDUPLICATION ===
    this.lastNotificationTime = new Map();
    this.notificationCooldown = 2000;
    
    // ✅ CORRECTION CRITIQUE 1: Setup handlers IMMÉDIATEMENT dans constructor
    if (this.gameRoom && typeof this.gameRoom.onMessage === 'function') {
      console.log('📡 [QuestManager] Setup handlers immédiat dans constructor...');
      this.setupServerListeners();
    } else {
      console.warn('⚠️ [QuestManager] GameRoom invalide, handlers non configurés');
    }
    
    console.log('📖 [QuestManager] Instance créée - Version ultra-robuste');
  }
  
  // === 🚀 INITIALISATION ROBUSTE ===
  
  async init() {
    try {
      console.log('🚀 [QuestManager] Initialisation robuste...');
      
      if (!this.gameRoom) {
        throw new Error('GameRoom requis pour QuestManager');
      }
      
      this.validateHandlersOrRetry();
      this.verifyConnections();
      this.scheduleInitialDataRequest();
      
      this.initialized = true;
      console.log('✅ [QuestManager] Initialisé avec succès');
      
      return this;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur initialisation:', error);
      await this.initializeFallbackMode();
      throw error;
    }
  }
  
  validateHandlersOrRetry() {
    const requiredHandlers = [
      'availableQuestsList', 'activeQuestsList', 'questStartResult',
      'questGranted', 'questProgressUpdate', 'questCompleted'
    ];
    
    const missingHandlers = requiredHandlers.filter(handler => 
      !this.gameRoom._messageHandlers?.[handler]
    );
    
    if (missingHandlers.length > 0) {
      console.warn('⚠️ [QuestManager] Handlers manquants:', missingHandlers);
      console.log('🔄 [QuestManager] Re-setup handlers...');
      this.setupServerListeners();
      
      const stillMissing = requiredHandlers.filter(handler => 
        !this.gameRoom._messageHandlers?.[handler]
      );
      
      if (stillMissing.length > 0) {
        console.error('❌ [QuestManager] Handlers toujours manquants:', stillMissing);
      } else {
        console.log('✅ [QuestManager] Tous les handlers maintenant enregistrés');
      }
    } else {
      console.log('✅ [QuestManager] Tous les handlers présents');
    }
  }
  
  async initializeFallbackMode() {
    console.log('🔄 [QuestManager] Mode fallback activé...');
    this.activeQuests = this.generateFallbackQuests();
    this.calculateStats();
    this.triggerCallbacks();
    this.initialized = true;
  }
  
  generateFallbackQuests() {
    return [
      {
        id: 'fallback_welcome',
        name: 'Bienvenue dans l\'aventure',
        description: 'Explorez le monde et découvrez vos premiers Pokémon.',
        category: 'main',
        currentStepIndex: 0,
        steps: [
          {
            id: 'welcome_step',
            name: 'Explorer les environs',
            description: 'Explorez la zone de départ',
            objectives: [
              {
                id: 'explore_obj',
                description: 'Explorez les environs',
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
  
  scheduleInitialDataRequest() {
    setTimeout(() => this.requestInitialData(), 500);
    setTimeout(() => {
      if (this.activeQuests.length === 0) {
        console.log('🔄 [QuestManager] Pas de quêtes reçues, retry...');
        this.requestInitialData();
      }
    }, 3000);
  }
  
  // === 📡 COMMUNICATION SERVEUR ROBUSTE ===
  
  setupServerListeners() {
    if (!this.gameRoom || typeof this.gameRoom.onMessage !== 'function') {
      console.error('❌ [QuestManager] GameRoom invalide pour setup handlers');
      return;
    }
    
    console.log('📡 [QuestManager] Configuration listeners serveur robuste...');
    
    try {
      this.gameRoom.onMessage("activeQuestsList", (data) => {
        this.safeHandleMessage('activeQuestsList', data, this.handleActiveQuestsReceived);
      });
      
      this.gameRoom.onMessage("availableQuestsList", (data) => {
        this.safeHandleMessage('availableQuestsList', data, this.handleAvailableQuestsReceived);
      });
      
      this.gameRoom.onMessage("questStartResult", (data) => {
        this.safeHandleMessage('questStartResult', data, this.handleQuestStartResult);
      });
      
      this.gameRoom.onMessage("questGranted", (data) => {
        this.safeHandleMessage('questGranted', data, this.handleQuestGranted);
      });
      
      this.gameRoom.onMessage("questProgressUpdate", (data) => {
        this.safeHandleMessage('questProgressUpdate', data, this.handleQuestProgressUpdate);
      });
      
      this.gameRoom.onMessage("questCompleted", (data) => {
        this.safeHandleMessage('questCompleted', data, this.handleQuestCompleted);
      });
      
      this.gameRoom.onMessage("questStatuses", (data) => {
        this.safeHandleMessage('questStatuses', data, this.handleQuestStatuses);
      });
      
      this.gameRoom.onMessage("triggerIntroSequence", (data) => {
        this.safeHandleMessage('triggerIntroSequence', data, this.handleIntroSequence);
      });
      
      this.gameRoom.onMessage("introQuestCompleted", (data) => {
        this.safeHandleMessage('introQuestCompleted', data, this.handleIntroQuestCompleted);
      });
      
      console.log('✅ [QuestManager] Listeners serveur configurés avec sécurité');
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur setup listeners:', error);
    }
  }
  
  safeHandleMessage(type, data, handler) {
    try {
      console.log(`📨 [QuestManager] Message ${type} reçu:`, data);
      handler.call(this, data);
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur handler ${type}:`, error);
      
      if (type === 'activeQuestsList' && this.fallbackEnabled) {
        this.handleActiveQuestsReceived([]);
      }
    }
  }
  
  verifyConnections() {
    console.log('🔍 [QuestManager] Vérification connexions...');
    
    if (!this.gameRoom) {
      throw new Error('GameRoom manquant');
    }
    
    if (typeof this.gameRoom.send !== 'function') {
      throw new Error('gameRoom.send non disponible');
    }
    
    console.log('✅ [QuestManager] Connexions vérifiées');
  }
  
  // === 📤 REQUÊTES SERVEUR AVEC QUEUE ===
  
  async requestWithQueue(messageType, data = null) {
    return new Promise((resolve, reject) => {
      const request = {
        messageType,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0
      };
      
      this.requestQueue.push(request);
      this.processRequestQueue();
    });
  }
  
  async processRequestQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        await this.processRequest(request);
        request.resolve(true);
      } catch (error) {
        if (request.retries < this.maxRetries) {
          request.retries++;
          this.requestQueue.unshift(request);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        } else {
          request.reject(error);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.processingQueue = false;
  }
  
  async processRequest(request) {
    if (!this.canSendRequest()) {
      throw new Error('Cooldown actif');
    }
    
    console.log(`📤 [QuestManager] Envoi requête: ${request.messageType}`);
    
    this.gameRoom.send(request.messageType, request.data);
    this.lastDataRequest = Date.now();
  }
  
  canSendRequest() {
    const now = Date.now();
    return (now - this.lastDataRequest) > this.requestCooldown;
  }
  
  requestInitialData() {
    console.log('📤 [QuestManager] Demande données initiales robuste...');
    
    this.requestWithQueue("getActiveQuests")
      .catch(error => console.warn('⚠️ Erreur getActiveQuests:', error));
    
    this.requestWithQueue("clientIntroReady")
      .catch(error => console.warn('⚠️ Erreur clientIntroReady:', error));
  }
  
  requestQuestData() {
    this.requestWithQueue("getActiveQuests")
      .catch(error => console.warn('⚠️ Erreur requestQuestData:', error));
  }
  
  requestAvailableQuests() {
    this.requestWithQueue("getAvailableQuests")
      .catch(error => console.warn('⚠️ Erreur getAvailableQuests:', error));
  }
  
  startQuest(questId) {
    this.requestWithQueue("startQuest", { questId })
      .catch(error => console.warn('⚠️ Erreur startQuest:', error));
  }
  
  // === 📊 HANDLERS DONNÉES ROBUSTES ===
  
  handleActiveQuestsReceived(data) {
    try {
      console.log('📊 [QuestManager] Traitement quêtes actives robuste:', data);
      
      let questArray = [];
      
      if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      } else if (Array.isArray(data)) {
        questArray = data;
      } else if (data && typeof data === 'object') {
        questArray = [data];
      }
      
      this.activeQuests = questArray
        .map(quest => this.normalizeQuestData(quest))
        .filter(quest => quest && (quest.id || quest._id));
      
      console.log(`📊 [QuestManager] ${this.activeQuests.length} quêtes actives parsées`);
      
      this.calculateStats();
      this.triggerCallbacks();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleActiveQuests:', error);
      
      if (this.activeQuests.length === 0 && this.fallbackEnabled) {
        this.activeQuests = this.generateFallbackQuests();
        this.calculateStats();
        this.triggerCallbacks();
      }
    }
  }
  
  handleAvailableQuestsReceived(data) {
    try {
      console.log('📊 [QuestManager] Traitement quêtes disponibles:', data);
      
      let questArray = [];
      if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      } else if (Array.isArray(data)) {
        questArray = data;
      }
      
      this.availableQuests = questArray
        .map(quest => this.normalizeQuestData(quest))
        .filter(quest => quest && (quest.id || quest._id));
      
      console.log(`📊 [QuestManager] ${this.availableQuests.length} quêtes disponibles parsées`);
      
      this.processPendingNpcInteraction();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleAvailableQuests:', error);
      this.processPendingNpcInteraction();
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestManager] Résultat démarrage quête:', data);
    
    if (data.success) {
      this.showNotification(`Quête "${data.quest?.name || 'Inconnue'}" acceptée !`, 'success');
      this.triggerCallback('onQuestStarted', data.quest);
      setTimeout(() => this.requestQuestData(), 500);
    } else {
      this.showNotification(data.message || "Impossible de démarrer cette quête", 'error');
    }
  }
  
  handleQuestGranted(data) {
    console.log('🎁 [QuestManager] Quête accordée:', data);
    
    this.showNotification(`Nouvelle quête : ${data.questName || 'Inconnue'} !`, 'success');
    
    this.triggerCallback('onQuestStarted', {
      id: data.questId,
      name: data.questName,
      granted: true
    });
    
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestProgressUpdate(data) {
    console.log('📈 [QuestManager] Progression quête:', data);
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ [QuestManager] Format progression invalide:', data);
      return;
    }
    
    data.forEach(result => {
      if (result.questCompleted) {
        this.triggerCallback('onQuestCompleted', result);
      } else {
        this.triggerCallback('onQuestProgress', result);
      }
      
      if (result.objectiveCompleted) {
        this.showNotification(`Objectif complété : ${result.objectiveName}`, 'success');
      } else if (result.stepCompleted) {
        this.showNotification(`Étape terminée : ${result.stepName}`, 'success');
      } else if (result.questCompleted) {
        this.showNotification(`Quête terminée : ${result.questName} !`, 'success');
      }
    });
    
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestCompleted(data) {
    console.log('🎉 [QuestManager] Quête terminée:', data);
    
    this.showNotification(data.message || "Félicitations ! Quête terminée !", 'success');
    this.triggerCallback('onQuestCompleted', data);
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestStatuses(data) {
    console.log('📊 [QuestManager] Statuts quêtes NPCs:', data);
    
    if (data.questStatuses && Array.isArray(data.questStatuses)) {
      this.updateNpcQuestStatuses(data.questStatuses);
    }
  }
  
  handleIntroSequence(data) {
    console.log('🎬 [QuestManager] Séquence intro déclenchée:', data);
    
    if (data.shouldStartIntro) {
      this.triggerIntroSequence(data);
    }
  }
  
  handleIntroQuestCompleted(data) {
    console.log('🎓 [QuestManager] Quête intro terminée:', data);
    
    this.showNotification(data.message || "Félicitations ! Vous avez terminé l'introduction !", 'success');
  }
  
  // === 🗣️ INTERACTION NPC ULTRA-ROBUSTE ===
  
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] === INTERACTION NPC ROBUSTE ===');
    console.log('📊 [QuestManager] Data NPC:', data);
    
    try {
      const npcId = this.extractNpcId(data);
      if (npcId) {
        this.interactionHistory.set(npcId, {
          data: data,
          timestamp: Date.now(),
          attempts: (this.interactionHistory.get(npcId)?.attempts || 0) + 1
        });
      }
      
      if (data && typeof data === 'object' && data.type) {
        return this.processNpcInteractionData(data);
      }
      
      if (data && (data.npcId || data.id || data.name)) {
        return this.processNpcDirectInteraction(data);
      }
      
      console.log('ℹ️ [QuestManager] Aucune donnée NPC spécifique');
      return 'NO_QUEST';
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleNpcInteraction:', error);
      return false;
    }
  }
  
  extractNpcId(data) {
    return data?.npcId || data?.id || data?.targetId || 
           (data?.name ? `name_${data.name}` : null);
  }
  
  processNpcInteractionData(data) {
    console.log('📊 [QuestManager] Traitement interaction typée:', data.type);
    
    switch (data.type) {
      case 'questGiver':
        return this.handleQuestGiverInteraction(data);
      case 'questComplete':
        return this.handleQuestCompleteInteraction(data);
      case 'questProgress':
        return this.handleQuestProgressInteraction(data);
      default:
        console.log(`ℹ️ [QuestManager] Type non-quest: ${data.type}`);
        return 'NO_QUEST';
    }
  }
  
  processNpcDirectInteraction(npcData) {
    console.log('🎯 [QuestManager] Traitement NPC direct:', npcData);
    
    const activeNpcQuests = this.findActiveQuestsForNpc(npcData);
    
    if (activeNpcQuests.length > 0) {
      console.log(`✅ [QuestManager] ${activeNpcQuests.length} quêtes actives trouvées`);
      return this.showActiveQuestDialog(npcData, activeNpcQuests);
    }
    
    const availableNpcQuests = this.findAvailableQuestsForNpc(npcData);
    
    if (availableNpcQuests.length > 0) {
      console.log(`✅ [QuestManager] ${availableNpcQuests.length} quêtes disponibles trouvées`);
      return this.showQuestSelectionDialog(npcData.name || 'NPC', availableNpcQuests);
    }
    
    console.log('📤 [QuestManager] Demande quêtes serveur pour NPC...');
    this.requestAvailableQuestsForNpc(npcData);
    return true;
  }
  
  handleQuestGiverInteraction(data) {
    console.log('🎁 [QuestManager] Quest Giver détecté:', data);
    
    if (data.availableQuests && Array.isArray(data.availableQuests) && data.availableQuests.length > 0) {
      return this.showQuestSelectionDialog(data.npcName, data.availableQuests);
    } else {
      console.log('📤 [QuestManager] Demande quêtes disponibles...');
      this.requestAvailableQuestsForNpc(data);
      return true;
    }
  }
  
  handleQuestCompleteInteraction(data) {
    console.log('✅ [QuestManager] Quest Complete détectée:', data);
    
    if (data.lines && data.lines.length > 0) {
      this.showQuestCompletionDialog(data);
    }
    
    return true;
  }
  
  handleQuestProgressInteraction(data) {
    console.log('📈 [QuestManager] Quest Progress détectée:', data);
    
    if (data.questProgress && Array.isArray(data.questProgress)) {
      this.handleQuestProgressUpdate(data.questProgress);
    }
    
    return true;
  }
  
  findActiveQuestsForNpc(npcData) {
    const npcId = this.extractNpcId(npcData);
    const npcName = npcData.npcName || npcData.name;
    
    console.log('🔍 [QuestManager] Recherche quêtes actives pour:', { npcId, npcName });
    
    return this.activeQuests.filter(quest => {
      const matches = this.questInvolvesNpc(quest, npcId, npcName);
      console.log(`${matches ? '✅' : '❌'} [QuestManager] Quest "${quest.name}" ${matches ? 'compatible' : 'incompatible'} avec NPC`);
      return matches;
    });
  }
  
  findAvailableQuestsForNpc(npcData) {
    const npcId = this.extractNpcId(npcData);
    const npcName = npcData.npcName || npcData.name;
    
    console.log('🔍 [QuestManager] Recherche quêtes disponibles pour:', { npcId, npcName });
    
    return this.availableQuests.filter(quest => {
      const matches = this.questMatchesNpc(quest, npcData);
      console.log(`${matches ? '✅' : '❌'} [QuestManager] Quest "${quest.name}" ${matches ? 'compatible' : 'incompatible'} avec NPC`);
      return matches;
    });
  }
  
  questMatchesNpc(quest, npcData) {
    if (!quest || !npcData) return false;
    
    const npcId = this.extractNpcId(npcData);
    const npcName = npcData.npcName || npcData.name;
    
    console.log('🔍 [QuestManager] Test matching:', {
      questName: quest.name,
      questId: quest.id,
      npcId: npcId,
      npcName: npcName
    });
    
    // Vérification ID direct
    if (npcId && (quest.startNpcId == npcId || quest.endNpcId == npcId || quest.npcId == npcId)) {
      console.log('✅ [QuestManager] Match trouvé: ID direct');
      return true;
    }
    
    // Vérification nom (case insensitive)
    if (npcName && quest.startNpcName && 
        quest.startNpcName.toLowerCase() === npcName.toLowerCase()) {
      console.log('✅ [QuestManager] Match trouvé: startNpcName');
      return true;
    }
    
    if (npcName && quest.endNpcName && 
        quest.endNpcName.toLowerCase() === npcName.toLowerCase()) {
      console.log('✅ [QuestManager] Match trouvé: endNpcName');
      return true;
    }
    
    // Vérification dans les étapes
    if (quest.steps && Array.isArray(quest.steps)) {
      for (const step of quest.steps) {
        if (step.objectives && Array.isArray(step.objectives)) {
          for (const obj of step.objectives) {
            if ((obj.targetNpcId && obj.targetNpcId == npcId) ||
                (obj.npcId && obj.npcId == npcId) ||
                (obj.target && obj.target == npcId) ||
                (npcName && obj.targetNpc && obj.targetNpc.toLowerCase() === npcName.toLowerCase()) ||
                (npcName && obj.npc && obj.npc.toLowerCase() === npcName.toLowerCase())) {
              console.log('✅ [QuestManager] Match trouvé: dans objectif step');
              return true;
            }
          }
        }
      }
    }
    
    // Fallback: si pas de restrictions NPC spécifiques, autoriser
    const hasNpcRestrictions = !!(
      quest.startNpcId || quest.endNpcId || quest.npcId ||
      quest.startNpcName || quest.endNpcName ||
      (quest.steps && quest.steps.some(step => 
        step.objectives && step.objectives.some(obj => 
          obj.targetNpcId || obj.npcId || obj.targetNpc || obj.npc
        )
      ))
    );
    
    if (!hasNpcRestrictions) {
      console.log('✅ [QuestManager] Match trouvé: quête générique');
      return true;
    }
    
    console.log('❌ [QuestManager] Aucun match trouvé');
    return false;
  }
  
  questInvolvesNpc(quest, npcId, npcName) {
    if (!quest || !quest.steps) return false;
    
    if (quest.startNpcId === npcId || quest.endNpcId === npcId) {
      return true;
    }
    
    return quest.steps.some(step => {
      if (step.objectives) {
        return step.objectives.some(obj => {
          return (
            obj.targetNpcId === npcId ||
            obj.targetNpc === npcName ||
            obj.npcId === npcId ||
            obj.npc === npcName ||
            obj.target === npcId?.toString()
          );
        });
      }
      return false;
    });
  }
  
  requestAvailableQuestsForNpc(npcData) {
    console.log('📤 [QuestManager] Demande quêtes pour NPC:', npcData);
    
    this.pendingNpcInteraction = {
      npcData,
      timestamp: Date.now()
    };
    
    setTimeout(() => {
      if (this.pendingNpcInteraction && 
          this.pendingNpcInteraction.timestamp === this.pendingNpcInteraction.timestamp) {
        console.log('⏰ [QuestManager] Timeout interaction NPC');
        this.pendingNpcInteraction = null;
      }
    }, this.npcInteractionTimeout);
    
    this.requestAvailableQuests();
  }
  
  processPendingNpcInteraction() {
    if (!this.pendingNpcInteraction) {
      console.log('ℹ️ [QuestManager] Aucune interaction NPC en attente');
      return;
    }
    
    console.log('🔄 [QuestManager] Traitement interaction NPC en attente');
    console.log('📊 [QuestManager] Quêtes disponibles totales:', this.availableQuests.length);
    
    const { npcData } = this.pendingNpcInteraction;
    this.pendingNpcInteraction = null;
    
    console.log('🎯 [QuestManager] NPC Data pour matching:', npcData);
    
    const npcQuests = this.availableQuests.filter((quest, index) => {
      console.log(`🔍 [QuestManager] Test quest ${index + 1}/${this.availableQuests.length}: ${quest.name}`);
      const matches = this.questMatchesNpc(quest, npcData);
      console.log(`${matches ? '✅' : '❌'} [QuestManager] Quest "${quest.name}" ${matches ? 'compatible' : 'incompatible'}`);
      return matches;
    });
    
    console.log(`📊 [QuestManager] Quêtes compatibles trouvées: ${npcQuests.length}/${this.availableQuests.length}`);
    
    if (npcQuests.length > 0) {
      console.log('✅ [QuestManager] Affichage dialogue sélection quêtes');
      this.showQuestSelectionDialog(npcData.npcName || npcData.name || 'NPC', npcQuests);
    } else {
      console.log('ℹ️ [QuestManager] Aucune quête disponible pour ce NPC');
      
      if (this.availableQuests.length > 0) {
        console.log('🔄 [QuestManager] Fallback: affichage de toutes les quêtes disponibles');
        this.showQuestSelectionDialog(
          (npcData.npcName || npcData.name || 'NPC') + ' (Toutes les quêtes)',
          this.availableQuests
        );
      }
    }
  }
  
  // === 🎭 DIALOGUES QUÊTES ===
  
  showQuestSelectionDialog(npcName, quests) {
    console.log('💬 [QuestManager] Dialogue sélection quêtes:', npcName, quests);
    
    if (!this.questUI || !this.questUI.showQuestDialog) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      if (quests.length === 1) {
        this.startQuest(quests[0].id);
      }
      return true;
    }
    
    this.questUI.showQuestDialog(
      `${npcName || 'Donneur de quêtes'} - Choisir une quête`,
      quests,
      (selectedQuestId) => {
        console.log('✅ [QuestManager] Quête sélectionnée:', selectedQuestId);
        this.startQuest(selectedQuestId);
      }
    );
    
    return true;
  }
  
  showActiveQuestDialog(npcData, quests) {
    console.log('🎭 [QuestManager] Dialogue quêtes actives:', npcData, quests);
    
    if (!this.questUI) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      return false;
    }
    
    const npcName = npcData.name || 'NPC';
    this.questUI.showQuestDialog(
      `${npcName} - Quêtes actives`,
      quests,
      (selectedQuestId) => {
        // Action pour quête active (voir détails, terminer, etc.)
        console.log('📖 [QuestManager] Consultation quête active:', selectedQuestId);
      }
    );
    
    return true;
  }
  
  showQuestCompletionDialog(data) {
    console.log('🎉 [QuestManager] Dialogue complétion quête:', data);
    
    if (typeof window.showNpcDialogue === 'function') {
      const dialogueData = {
        portrait: data.portrait || "/assets/portrait/defaultPortrait.png",
        name: data.npcName || "PNJ",
        lines: data.lines || ["Félicitations ! Quête terminée !"]
      };
      
      window.showNpcDialogue(dialogueData);
    }
  }
  
  // === 📈 PROGRESSION AUTOMATIQUE ===
  
  triggerCollectEvent(itemId, amount = 1) {
    if (this.shouldTriggerEvent('collect', `${itemId}_${amount}`)) {
      this.triggerProgress({
        type: 'collect',
        targetId: itemId,
        amount: amount
      });
    }
  }
  
  triggerDefeatEvent(pokemonId) {
    if (this.shouldTriggerEvent('defeat', pokemonId)) {
      this.triggerProgress({
        type: 'defeat',
        pokemonId: pokemonId,
        amount: 1
      });
    }
  }
  
  triggerReachEvent(zoneId, x, y, map) {
    if (this.shouldTriggerEvent('reach', zoneId)) {
      this.triggerProgress({
        type: 'reach',
        targetId: zoneId,
        location: { x, y, map }
      });
    }
  }
  
  triggerDeliverEvent(npcId, itemId) {
    if (this.shouldTriggerEvent('deliver', `${npcId}_${itemId}`)) {
      this.triggerProgress({
        type: 'deliver',
        npcId: npcId,
        targetId: itemId
      });
    }
  }
  
  triggerTalkEvent(npcId) {
    if (this.shouldTriggerEvent('talk', npcId)) {
      this.triggerProgress({
        type: 'talk',
        npcId: npcId,
        targetId: npcId.toString()
      });
    }
  }
  
  shouldTriggerEvent(type, identifier) {
    const key = `${type}_${identifier}`;
    const now = Date.now();
    const lastTime = this.lastNotificationTime.get(key);
    
    if (!lastTime || (now - lastTime) > this.notificationCooldown) {
      this.lastNotificationTime.set(key, now);
      return true;
    }
    
    console.log(`🔕 [QuestManager] Événement dédupliqué: ${key}`);
    return false;
  }
  
  triggerProgress(data) {
    this.requestWithQueue("questProgress", data)
      .catch(error => console.warn('⚠️ Erreur triggerProgress:', error));
  }
  
  // === 🎬 ACTIONS UTILISATEUR ===
  
  handleAction(action, data) {
    console.log(`🎬 [QuestManager] Action: ${action}`, data);
    
    if (!this.gameRoom) {
      console.warn('⚠️ [QuestManager] Pas de gameRoom pour action');
      return;
    }
    
    switch (action) {
      case 'startQuest':
        this.startQuest(data.questId);
        break;
        
      case 'refreshQuests':
        this.requestQuestData();
        break;
        
      case 'getAvailableQuests':
        this.requestAvailableQuests();
        break;
        
      case 'triggerProgress':
        this.triggerProgress(data);
        break;
        
      case 'debugQuests':
        this.debugQuests();
        break;
        
      default:
        console.warn(`⚠️ [QuestManager] Action inconnue: ${action}`);
    }
  }
  
  debugQuests() {
    this.requestWithQueue("debugPlayerQuests")
      .catch(error => console.warn('⚠️ Erreur debugQuests:', error));
  }
  
  // === 🔗 CONNEXION AVEC QUESTUI ===
  
  connectQuestUI(questUI) {
    console.log('🔗 [QuestManager] Connexion avec QuestUI');
    this.questUI = questUI;
    
    if (this.activeQuests.length > 0 && questUI.updateQuestData) {
      questUI.updateQuestData(this.activeQuests, 'active');
    }
  }
  
  // === 📊 CALCULS ET CALLBACKS ===
  
  calculateStats() {
    this.questStats.totalActive = this.activeQuests.length;
    this.questStats.newQuests = this.activeQuests.filter(q => q.isNew).length;
    this.questStats.readyToComplete = this.activeQuests.filter(q => 
      q.status === 'readyToComplete' || q.currentStepIndex >= (q.steps?.length || 0)
    ).length;
    
    console.log('📊 [QuestManager] Stats calculées:', this.questStats);
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
  
  updateNpcQuestStatuses(statuses) {
    if (window.npcManager && window.npcManager.updateQuestStatuses) {
      window.npcManager.updateQuestStatuses(statuses);
    }
    
    window.dispatchEvent(new CustomEvent('questStatusesUpdated', {
      detail: { statuses }
    }));
  }
  
  triggerIntroSequence(data) {
    console.log('🎬 [QuestManager] Démarrage séquence intro...');
    
    if (this.gameRoom) {
      this.gameRoom.send("intro_started");
    }
    
    if (typeof window.createSequentialDiscussion === 'function') {
      const introMessages = [
        {
          speaker: "Narrator",
          portrait: "/assets/portrait/narratorPortrait.png",
          text: "Bienvenue dans votre aventure Pokémon !",
          hideName: true
        },
        {
          speaker: "Psyduck",
          portrait: "/assets/portrait/psyduckPortrait.png",
          text: "Salut ! Je suis Psyduck et je vais t'accompagner dans tes premiers pas !"
        },
        {
          speaker: "Psyduck", 
          portrait: "/assets/portrait/psyduckPortrait.png",
          text: "Viens, suis-moi ! Je vais te montrer les bases de ce monde."
        }
      ];
      
      window.createSequentialDiscussion(
        "Psyduck",
        "/assets/portrait/psyduckPortrait.png",
        introMessages,
        {
          onComplete: () => {
            console.log('🎬 [QuestManager] Séquence intro terminée');
            
            if (this.gameRoom) {
              this.gameRoom.send("intro_completed");
            }
          }
        }
      );
    } else {
      console.warn('⚠️ [QuestManager] Système de dialogue non disponible pour intro');
    }
  }
  
  // === 🔧 UTILITAIRES ===
  
  normalizeQuestData(quest) {
    try {
      if (typeof quest === 'string') {
        quest = JSON.parse(quest);
      }

      const normalized = {
        id: quest.id || quest._id || `quest_${Date.now()}`,
        name: quest.name || 'Quête sans nom',
        description: quest.description || 'Pas de description disponible',
        category: quest.category || 'side',
        level: quest.level || '',
        currentStepIndex: quest.currentStepIndex || 0,
        status: quest.status || 'active',
        steps: []
      };

      if (quest.steps && Array.isArray(quest.steps)) {
        normalized.steps = quest.steps.map((step, index) => {
          try {
            if (typeof step === 'string') {
              step = JSON.parse(step);
            }
            
            return {
              id: step.id || `step_${index}`,
              name: step.name || `Étape ${index + 1}`,
              description: step.description || 'Pas de description',
              objectives: step.objectives || [],
              rewards: step.rewards || [],
              completed: step.completed || false
            };
          } catch (err) {
            console.warn("⚠️ [QuestManager] Erreur step:", err);
            return {
              id: `step_${index}`,
              name: `Étape ${index + 1}`,
              description: 'Description non disponible',
              objectives: [],
              rewards: [],
              completed: false
            };
          }
        });
      }

      return normalized;

    } catch (error) {
      console.error("❌ [QuestManager] Erreur normalizeQuestData:", error, quest);
      return {
        id: 'error_quest',
        name: 'Quête (Erreur)',
        description: 'Cette quête n\'a pas pu être chargée correctement.',
        category: 'error',
        steps: []
      };
    }
  }
  
  showNotification(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, {
        duration: 3000,
        position: 'bottom-center'
      });
    } else {
      console.log(`📢 [QuestManager] ${type.toUpperCase()}: ${message}`);
    }
  }
  
  // === 📖 GETTERS ===
  
  getActiveQuests() {
    return [...this.activeQuests];
  }
  
  getAvailableQuests() {
    return [...this.availableQuests];
  }
  
  getCompletedQuests() {
    return [...this.completedQuests];
  }
  
  getQuestStats() {
    return { ...this.questStats };
  }
  
  getQuestCount() {
    return this.activeQuests.length;
  }
  
  hasActiveQuests() {
    return this.activeQuests.length > 0;
  }
  
  hasNewQuests() {
    return this.questStats.newQuests > 0;
  }
  
  hasQuestsReadyToComplete() {
    return this.questStats.readyToComplete > 0;
  }
  
  getQuestById(questId) {
    return this.activeQuests.find(q => q.id === questId || q._id === questId) || null;
  }
  
  getQuestsByCategory(category) {
    return this.activeQuests.filter(q => q.category === category);
  }
  
  getMainQuests() {
    return this.getQuestsByCategory('main');
  }
  
  getSideQuests() {
    return this.getQuestsByCategory('side');
  }
  
  getDailyQuests() {
    return this.getQuestsByCategory('daily');
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [QuestManager] Destruction...');
    
    // Reset callbacks
    this.onQuestUpdate = null;
    this.onQuestStarted = null;
    this.onQuestCompleted = null;
    this.onQuestProgress = null;
    this.onStatsUpdate = null;
    
    // Reset données
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    this.questStats = {
      totalActive: 0,
      totalCompleted: 0,
      newQuests: 0,
      readyToComplete: 0
    };
    
    // Reset état
    this.initialized = false;
    this.gameRoom = null;
    this.questUI = null;
    this.pendingNpcInteraction = null;
    this.lastNotificationTime.clear();
    this.interactionHistory.clear();
    this.requestQueue = [];
    
    console.log('✅ [QuestManager] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  getDebugInfo() {
    return {
      initialized: this.initialized,
      questCount: this.getQuestCount(),
      questStats: this.questStats,
      hasGameRoom: !!this.gameRoom,
      hasQuestUI: !!this.questUI,
      lastDataRequest: this.lastDataRequest,
      pendingNpcInteraction: !!this.pendingNpcInteraction,
      requestQueueLength: this.requestQueue.length,
      processingQueue: this.processingQueue,
      interactionHistorySize: this.interactionHistory.size,
      callbacks: {
        onQuestUpdate: !!this.onQuestUpdate,
        onQuestStarted: !!this.onQuestStarted,
        onQuestCompleted: !!this.onQuestCompleted,
        onQuestProgress: !!this.onQuestProgress,
        onStatsUpdate: !!this.onStatsUpdate
      },
      questAnalysis: this.getQuestAnalysis(),
      availableQuestsCount: this.availableQuests.length,
      notificationCacheSize: this.lastNotificationTime.size,
      fallbackEnabled: this.fallbackEnabled
    };
  }
  
  getQuestAnalysis() {
    return {
      questCount: this.getQuestCount(),
      hasActiveQuests: this.hasActiveQuests(),
      newQuests: this.questStats.newQuests,
      readyToComplete: this.questStats.readyToComplete,
      categories: {
        main: this.getMainQuests().length,
        side: this.getSideQuests().length,
        daily: this.getDailyQuests().length
      },
      totalCompleted: this.questStats.totalCompleted,
      initialized: this.initialized,
      hasUI: !!this.questUI
    };
  }
  
  logDebugInfo() {
    console.log('🐛 [QuestManager] === DEBUG INFO ===', this.getDebugInfo());
  }
  
  debugQuestNpcMatching(npcData) {
    console.log('🐛 [QuestManager] === DEBUG QUEST-NPC MATCHING ===');
    console.log('📊 NPC Data:', npcData);
    console.log('📊 Quêtes disponibles:', this.availableQuests.length);
    
    this.availableQuests.forEach((quest, index) => {
      console.log(`\n--- Quest ${index + 1}: ${quest.name} ---`);
      console.log('Quest details:', {
        id: quest.id,
        startNpcId: quest.startNpcId,
        endNpcId: quest.endNpcId,
        npcId: quest.npcId,
        startNpcName: quest.startNpcName,
        endNpcName: quest.endNpcName
      });
      
      const matches = this.questMatchesNpc(quest, npcData);
      console.log(`Result: ${matches ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
    });
    
    console.log('🐛 [QuestManager] === FIN DEBUG ===');
  }
}

export default QuestManager;

console.log(`
📖 === QUEST MANAGER ULTRA-ROBUSTE COMPLET ===

✅ CORRECTIONS MAJEURES:
1. Setup handlers IMMÉDIAT dans constructor
2. Validation et retry handlers automatique
3. Queue de requêtes avec retry automatique
4. NPC matching intelligent et permissif
5. Fallbacks robustes partout
6. Error handling complet sur tous les handlers
7. Déduplication et cooldowns intelligents

🎯 FONCTIONNALITÉS COMPLÈTES:
• Communication serveur ultra-robuste
• Interaction NPC avec matching intelligent
• Progression automatique des quêtes
• Gestion des dialogues et sélections
• Callbacks et événements complets
• Normalisation des données automatique
• Debug et diagnostics avancés

🔧 ROBUSTESSE:
• Queue de requêtes avec retry
• Handlers avec error catching
• Fallback mode automatique
• Validation des connexions
• Cooldowns et déduplication
• Recovery automatique

🎮 QUEST MANAGER MAINTENANT ULTRA-FIABLE !
`);
