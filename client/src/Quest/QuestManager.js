// Quest/QuestManager.js - Business Logic Quest Simplifié
// 🎯 Gère UNIQUEMENT la logique métier, pas l'UI

export class QuestManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    
    // === DONNÉES ===
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    this.questStats = {
      totalActive: 0,
      totalCompleted: 0,
      newQuests: 0,
      readyToComplete: 0
    };
    
    // === CALLBACKS ===
    this.onQuestUpdate = null;        // Appelé quand une quête change
    this.onQuestStarted = null;       // Appelé quand une quête démarre
    this.onQuestCompleted = null;     // Appelé quand une quête se termine
    this.onQuestProgress = null;      // Appelé lors de progression
    this.onStatsUpdate = null;        // Appelé quand stats changent
    
    // === ÉTAT ===
    this.initialized = false;
    this.lastDataRequest = 0;
    
    // === DÉDUPLICATION NOTIFICATIONS ===
    this.lastNotificationTime = new Map();
    this.notificationCooldown = 2000;
    
    console.log('📖 [QuestManager] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestManager] Initialisation...');
      console.log('🔍 [QuestManager] GameRoom disponible:', !!this.gameRoom);
      
      if (!this.gameRoom) {
        console.error('❌ [QuestManager] ERREUR: Pas de gameRoom pour initialiser !');
        throw new Error('GameRoom requis pour QuestManager');
      }
      
      console.log('📡 [QuestManager] Configuration des listeners...');
      this.setupServerListeners();
      
      // Vérifier que les listeners sont bien configurés
      setTimeout(() => {
        this.verifyListeners();
      }, 100);
      
      // Demander les données après configuration
      setTimeout(() => {
        console.log('📤 [QuestManager] Demande initiale de données...');
        this.requestQuestData();
      }, 200);
      
      this.initialized = true;
      
      console.log('✅ [QuestManager] Initialisé');
      return this;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 📡 COMMUNICATION SERVEUR ===
  
  setupServerListeners() {
    if (!this.gameRoom) {
      console.error('⚠️ [QuestManager] setupServerListeners: Pas de gameRoom');
      return;
    }

    console.log('📡 [QuestManager] Configuration des listeners pour gameRoom...');
    console.log('🔍 [QuestManager] GameRoom type:', this.gameRoom.constructor.name);

    try {
      if (typeof this.gameRoom.onMessage !== 'function') {
        console.error('❌ [QuestManager] gameRoom.onMessage n\'est pas une fonction !');
        return;
      }

      // Quêtes actives
      this.gameRoom.onMessage("activeQuestsList", (data) => {
        console.log('📋 [QuestManager] ✅ MESSAGE activeQuestsList REÇU:', data);
        this.handleActiveQuestsReceived(data);
      });

      // Quêtes disponibles
      this.gameRoom.onMessage("availableQuests", (data) => {
        console.log('📋 [QuestManager] ✅ MESSAGE availableQuests REÇU:', data);
        this.handleAvailableQuestsReceived(data);
      });

      // Démarrage de quête
      this.gameRoom.onMessage("questStartResult", (data) => {
        console.log('🎯 [QuestManager] ✅ MESSAGE questStartResult REÇU:', data);
        this.handleQuestStartResult(data);
      });

      // Quête accordée automatiquement
      this.gameRoom.onMessage("questGranted", (data) => {
        console.log('🎁 [QuestManager] ✅ MESSAGE questGranted REÇU:', data);
        this.handleQuestGranted(data);
      });

      // Progression de quête
      this.gameRoom.onMessage("questProgressUpdate", (data) => {
        console.log('📈 [QuestManager] ✅ MESSAGE questProgressUpdate REÇU:', data);
        this.handleQuestProgress(data);
      });

      // Récompenses de quête
      this.gameRoom.onMessage("questRewards", (data) => {
        console.log('🎁 [QuestManager] ✅ MESSAGE questRewards REÇU:', data);
        this.handleQuestRewards(data);
      });

      // Interaction NPC
      this.gameRoom.onMessage("npcInteractionResult", (data) => {
        console.log('🗣️ [QuestManager] ✅ MESSAGE npcInteractionResult REÇU:', data);
        this.handleNpcInteraction(data);
      });

      console.log('✅ [QuestManager] Listeners serveur configurés avec succès');
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur configuration listeners:', error);
    }
  }
  
  verifyListeners() {
    if (!this.gameRoom) {
      console.error('❌ [QuestManager] Vérification impossible: pas de gameRoom');
      return;
    }

    console.log('🔍 [QuestManager] === VÉRIFICATION LISTENERS ===');
    
    try {
      const handlers = this.gameRoom._messageHandlers || {};
      const handlerKeys = Object.keys(handlers);
      
      console.log('📋 [QuestManager] Listeners configurés:', handlerKeys);
      
      const requiredListeners = [
        'activeQuestsList', 'availableQuests', 'questStartResult', 
        'questGranted', 'questProgressUpdate', 'questRewards', 'npcInteractionResult'
      ];
      const missingListeners = requiredListeners.filter(listener => !handlerKeys.includes(listener));
      
      if (missingListeners.length === 0) {
        console.log('✅ [QuestManager] Tous les listeners Quest sont configurés');
      } else {
        console.error('❌ [QuestManager] Listeners manquants:', missingListeners);
        console.log('🔧 [QuestManager] Tentative de reconfiguration...');
        this.setupServerListeners();
      }
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur vérification listeners:', error);
    }
  }
  
  requestQuestData() {
    if (!this.gameRoom || !this.canSendRequest()) {
      console.warn('⚠️ [QuestManager] Impossible d\'envoyer requestQuestData');
      console.log('🔍 [QuestManager] GameRoom exists:', !!this.gameRoom);
      console.log('🔍 [QuestManager] Can send request:', this.canSendRequest());
      return;
    }

    console.log('📤 [QuestManager] ===== ENVOI DEMANDE QUÊTES =====');
    console.log('🎯 [QuestManager] Message: "getActiveQuests"');
    
    try {
      this.gameRoom.send("getActiveQuests");
      this.lastDataRequest = Date.now();
      console.log('✅ [QuestManager] Demande envoyée avec succès');
    } catch (error) {
      console.error('❌ [QuestManager] Erreur envoi demande:', error);
    }
  }
  
  canSendRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastDataRequest;
    return timeSinceLastRequest > 1000; // 1 seconde de cooldown
  }
  
  // === 📊 GESTION DONNÉES ===
  
  handleActiveQuestsReceived(data) {
    try {
      console.log('📊 [QuestManager] ===== QUÊTES ACTIVES REÇUES =====');
      console.log('📊 [QuestManager] Data brute:', data);
      
      let questArray = [];
      
      if (data && data.quests && Array.isArray(data.quests)) {
        questArray = data.quests;
        console.log('✅ [QuestManager] Format: data.quests (array)');
      } else if (Array.isArray(data)) {
        questArray = data;
        console.log('✅ [QuestManager] Format: data direct (array)');
      } else {
        console.warn('⚠️ [QuestManager] Format données inattendu:', data);
        questArray = [];
      }
      
      // Filtrer et valider
      this.activeQuests = questArray.filter(quest => {
        if (!quest) return false;
        
        if (!quest.id && !quest._id) {
          console.warn('⚠️ [QuestManager] Quête sans ID:', quest);
          return false;
        }
        
        return true;
      });
      
      console.log('📊 [QuestManager] Quêtes actives parsées:', {
        count: this.activeQuests.length,
        quests: this.activeQuests.map(q => ({
          id: q.id || q._id,
          name: q.name || 'Unknown',
          category: q.category || 'side',
          progress: `${q.currentStepIndex || 0}/${q.steps?.length || 0}`
        }))
      });
      
      // Calculer les stats
      this.calculateStats();
      
      // Envoyer callbacks
      console.log('📤 [QuestManager] Envoi callbacks...');
      
      if (this.onQuestUpdate && typeof this.onQuestUpdate === 'function') {
        console.log('📤 [QuestManager] Appel onQuestUpdate');
        this.onQuestUpdate(this.activeQuests);
      } else {
        console.warn('⚠️ [QuestManager] onQuestUpdate non configuré');
      }
      
      if (this.onStatsUpdate && typeof this.onStatsUpdate === 'function') {
        console.log('📤 [QuestManager] Appel onStatsUpdate');
        this.onStatsUpdate(this.questStats);
      } else {
        console.warn('⚠️ [QuestManager] onStatsUpdate non configuré');
      }
      
      console.log('✅ [QuestManager] Traitement quêtes actives terminé');
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes actives:', error);
    }
  }
  
  handleAvailableQuestsReceived(data) {
    try {
      console.log('📊 [QuestManager] Quêtes disponibles reçues:', data);
      
      let questArray = [];
      if (data && Array.isArray(data.quests)) {
        questArray = data.quests;
      } else if (Array.isArray(data)) {
        questArray = data;
      }
      
      this.availableQuests = questArray.filter(quest => quest && (quest.id || quest._id));
      
      console.log('📊 [QuestManager] Quêtes disponibles parsées:', this.availableQuests.length);
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes disponibles:', error);
    }
  }
  
  calculateStats() {
    this.questStats.totalActive = this.activeQuests.length;
    this.questStats.newQuests = this.activeQuests.filter(q => q.isNew).length;
    this.questStats.readyToComplete = this.activeQuests.filter(q => 
      q.currentStepIndex >= (q.steps?.length || 0)
    ).length;
    
    console.log('📊 [QuestManager] Stats calculées:', this.questStats);
  }
  
  // === 🎬 GESTION ÉVÉNEMENTS ===
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestManager] Résultat démarrage quête:', data);
    
    if (data.success && this.onQuestStarted) {
      this.onQuestStarted(data.quest);
    }
    
    // Rafraîchir les données après démarrage
    if (data.success) {
      setTimeout(() => {
        this.requestQuestData();
      }, 500);
    }
  }
  
  handleQuestGranted(data) {
    console.log('🎁 [QuestManager] Quête accordée:', data);
    
    if (this.onQuestStarted) {
      this.onQuestStarted({
        id: data.questId,
        name: data.questName,
        granted: true
      });
    }
    
    // Rafraîchir les données
    setTimeout(() => {
      this.requestQuestData();
    }, 500);
  }
  
  handleQuestProgress(results) {
    console.log('📈 [QuestManager] Progression quête:', results);
    
    if (!Array.isArray(results)) return;
    
    results.forEach(result => {
      if (result.questCompleted && this.onQuestCompleted) {
        this.onQuestCompleted(result);
      } else if (this.onQuestProgress) {
        this.onQuestProgress(result);
      }
    });
    
    // Rafraîchir les données après progression
    setTimeout(() => {
      this.requestQuestData();
    }, 500);
  }
  
  handleQuestRewards(data) {
    console.log('🎁 [QuestManager] Récompenses quête:', data);
    
    if (this.onQuestCompleted) {
      this.onQuestCompleted({
        type: 'rewards',
        rewards: data.rewards
      });
    }
  }
  
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] Interaction NPC:', data);
    
    // Le QuestManager ne gère que la logique, pas l'UI
    // Les dialogues seront gérés par QuestUI
    
    if (data.type === 'questGiver' && data.availableQuests) {
      this.availableQuests = this.parseAvailableQuests(data.availableQuests);
    }
  }
  
  parseAvailableQuests(quests) {
    try {
      let questArray = quests;
      
      if (typeof questArray === 'string') {
        questArray = JSON.parse(questArray);
      }
      
      if (!Array.isArray(questArray)) {
        if (questArray.quests && Array.isArray(questArray.quests)) {
          questArray = questArray.quests;
        } else {
          questArray = [];
        }
      }
      
      return questArray.map(quest => this.normalizeQuestData(quest));
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur parsing quêtes disponibles:', error);
      return [];
    }
  }
  
  normalizeQuestData(quest) {
    try {
      if (typeof quest === 'string') {
        quest = JSON.parse(quest);
      }

      const normalized = {
        id: quest.id || `quest_${Date.now()}`,
        name: quest.name || 'Quête sans nom',
        description: quest.description || 'Pas de description disponible',
        category: quest.category || 'side',
        level: quest.level || '',
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
              rewards: step.rewards || []
            };
          } catch (err) {
            console.warn("⚠️ [QuestManager] Erreur step:", err);
            return {
              id: `step_${index}`,
              name: `Étape ${index + 1}`,
              description: 'Description non disponible',
              objectives: [],
              rewards: []
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
        
      case 'abandonQuest':
        this.abandonQuest(data.questId);
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
        
      default:
        console.warn(`⚠️ [QuestManager] Action inconnue: ${action}`);
    }
  }
  
  startQuest(questId) {
    if (!this.canSendRequest()) return;
    
    console.log('🎯 [QuestManager] Démarre quête:', questId);
    this.gameRoom.send("startQuest", { questId });
  }
  
  abandonQuest(questId) {
    if (!this.canSendRequest()) return;
    
    console.log('🚮 [QuestManager] Abandonne quête:', questId);
    this.gameRoom.send("abandonQuest", { questId });
  }
  
  requestAvailableQuests() {
    if (!this.canSendRequest()) return;
    
    console.log('📋 [QuestManager] Demande quêtes disponibles');
    this.gameRoom.send("getAvailableQuests");
  }
  
  triggerProgress(data) {
    if (!this.canSendRequest()) return;
    
    console.log('📈 [QuestManager] Déclenche progression:', data);
    this.gameRoom.send("questProgress", data);
  }
  
  // === 📖 GETTERS (LECTURE SEULE) ===
  
  getActiveQuests() {
    return [...this.activeQuests]; // Copie pour éviter mutations
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
  
  // === 📈 MÉTHODES PROGRESSION ===
  
  triggerCollectEvent(itemId, amount = 1) {
    if (this.shouldTriggerEvent('collect', `${itemId}_${amount}`)) {
      this.triggerProgress({
        type: 'collect',
        itemId: itemId,
        amount: amount
      });
    }
  }
  
  triggerDefeatEvent(pokemonId) {
    if (this.shouldTriggerEvent('defeat', pokemonId)) {
      this.triggerProgress({
        type: 'defeat',
        pokemonId: pokemonId
      });
    }
  }
  
  triggerReachEvent(zoneId, x, y, map) {
    if (this.shouldTriggerEvent('reach', zoneId)) {
      this.triggerProgress({
        type: 'reach',
        zoneId: zoneId,
        x: x,
        y: y,
        map: map
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
  
  // === 📊 STATISTIQUES AVANCÉES ===
  
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
      totalCompleted: this.questStats.totalCompleted
    };
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
    this.lastNotificationTime.clear();
    
    console.log('✅ [QuestManager] Détruit');
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.initialized,
      questCount: this.getQuestCount(),
      questStats: this.questStats,
      hasGameRoom: !!this.gameRoom,
      lastDataRequest: this.lastDataRequest,
      callbacks: {
        onQuestUpdate: !!this.onQuestUpdate,
        onQuestStarted: !!this.onQuestStarted,
        onQuestCompleted: !!this.onQuestCompleted,
        onQuestProgress: !!this.onQuestProgress,
        onStatsUpdate: !!this.onStatsUpdate
      },
      questAnalysis: this.getQuestAnalysis()
    };
  }
}

export default QuestManager;

console.log(`
📖 === QUEST MANAGER SIMPLIFIÉ ===

✅ RESPONSABILITÉS:
- Gestion données quêtes
- Communication serveur
- Calcul statistiques
- Actions quêtes

🚫 PAS D'UI:
- Pas de DOM
- Pas d'affichage
- Callbacks pour notifier

📡 ACTIONS SERVEUR:
- getActiveQuests → requestQuestData()
- getAvailableQuests → requestAvailableQuests()
- startQuest → startQuest(id)
- abandonQuest → abandonQuest(id)
- questProgress → triggerProgress(data)

📊 API LECTURE:
- getActiveQuests() → données complètes
- getQuestStats() → statistiques
- hasActiveQuests() → a des quêtes
- getQuestAnalysis() → analyse complète

🔗 CALLBACKS:
- onQuestUpdate(quests) → pour QuestUI
- onQuestStarted(quest) → nouvelle quête
- onQuestCompleted(quest) → quête terminée
- onStatsUpdate(stats) → pour QuestIcon

🎯 SIMPLE ET EFFICACE !
`);
