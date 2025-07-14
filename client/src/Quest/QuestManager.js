// Quest/QuestManager.js - Business Logic Quest Complet avec NPC Interaction
// 🎯 Gère UNIQUEMENT la logique métier, pas l'UI + Interaction NPCs

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
    this.questUI = null;              // Référence vers QuestUI pour dialogues
    this.pendingQuestGiver = null;    // ✅ NOUVEAU: NPC en attente de quêtes
    
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
      
      // ✅ CORRECTION: Gérer le cas où on attendait des quêtes pour un NPC
      if (this.pendingQuestGiver && this.availableQuests.length > 0) {
        console.log('🎁 [QuestManager] Traitement quêtes reçues pour NPC en attente');
        
        const questGiverData = {
          ...this.pendingQuestGiver,
          type: 'questGiver',
          availableQuests: this.availableQuests
        };
        
        // Réinitialiser le pending
        this.pendingQuestGiver = null;
        
        // Traiter maintenant qu'on a les quêtes
        return this.handleQuestGiverInteraction(questGiverData);
      }
      
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
  
  // === 🗣️ GESTION INTERACTION NPC (NOUVELLE MÉTHODE) ===
  
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] Gestion interaction NPC:', data);
    
    try {
      // Cas 1: Données complètes d'interaction
      if (data && typeof data === 'object') {
        return this.processNpcInteractionData(data);
      }
      
      // Cas 2: Données NPC directes
      if (data && (data.id || data.name)) {
        return this.processNpcData(data);
      }
      
      // Cas 3: Pas de données - dialogue générique
      console.log('⚠️ [QuestManager] Aucune donnée NPC, pas de quête à traiter');
      return 'NO_QUEST';
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleNpcInteraction:', error);
      return false;
    }
  }
  
  processNpcInteractionData(data) {
    console.log('📊 [QuestManager] Traitement données interaction:', data);
    
    // Vérifier le type d'interaction
    if (data.type === 'questGiver') {
      // ✅ CORRECTION: Gérer questGiver même sans availableQuests
      if (data.availableQuests && Array.isArray(data.availableQuests)) {
        console.log('📋 [QuestManager] QuestGiver avec quêtes explicites');
        return this.handleQuestGiverInteraction(data);
      } else {
        console.log('📋 [QuestManager] QuestGiver détecté - demande des quêtes au serveur');
        return this.handleQuestGiverWithoutQuests(data);
      }
    }
    
    if (data.type === 'questComplete' && data.questId) {
      return this.handleQuestCompletionInteraction(data);
    }
    
    if (data.type === 'questProgress' && data.questUpdates) {
      return this.handleQuestProgressInteraction(data);
    }
    
    // Vérifier les quêtes disponibles
    if (data.availableQuests && Array.isArray(data.availableQuests)) {
      return this.handleAvailableQuestsInteraction(data);
    }
    
    // Quêtes en cours avec ce NPC
    if (data.npcId || data.npcName) {
      return this.handleActiveQuestNpcInteraction(data);
    }
    
    // Pas de quête pour ce NPC
    console.log('ℹ️ [QuestManager] Aucune quête trouvée pour cette interaction');
    return 'NO_QUEST';
  }
  
  processNpcData(npcData) {
    console.log('🎯 [QuestManager] Traitement données NPC directes:', npcData);
    
    // Chercher des quêtes actives avec ce NPC
    const npcQuests = this.findQuestsForNpc(npcData);
    
    if (npcQuests.length > 0) {
      // Afficher les quêtes disponibles
      return this.showQuestDialog(npcData, npcQuests);
    }
    
    // Aucune quête trouvée
    console.log('ℹ️ [QuestManager] Aucune quête pour ce NPC');
    return 'NO_QUEST';
  }
  
  // === 🎯 NOUVELLE MÉTHODE: Gestion QuestGiver sans quêtes explicites ===
  
  handleQuestGiverWithoutQuests(data) {
    console.log('🎁 [QuestManager] QuestGiver sans quêtes - demande au serveur:', data);
    
    try {
      // Stocker les infos du NPC pour plus tard
      this.pendingQuestGiver = {
        npcId: data.npcId,
        npcName: data.npcName || data.name,
        message: data.message,
        lines: data.lines
      };
      
      // Demander les quêtes disponibles pour ce NPC au serveur
      if (this.gameRoom && this.canSendRequest()) {
        console.log('📤 [QuestManager] Demande des quêtes disponibles pour NPC');
        this.gameRoom.send("getAvailableQuests", { 
          npcId: data.npcId,
          npcName: data.npcName || data.name
        });
        this.lastDataRequest = Date.now();
        
        // Retourner true pour indiquer qu'on traite la demande
        return true;
      } else {
        console.warn('⚠️ [QuestManager] Impossible de demander les quêtes disponibles');
        return 'NO_QUEST';
      }
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur questGiver sans quêtes:', error);
      return false;
    }
  }
  
  handleQuestGiverInteraction(data) {
    console.log('🎁 [QuestManager] NPC donneur de quêtes:', data);
    
    try {
      const availableQuests = this.parseAvailableQuests(data.availableQuests);
      
      if (availableQuests.length === 0) {
        console.log('ℹ️ [QuestManager] Aucune quête disponible');
        return 'NO_QUEST';
      }
      
      // Afficher le dialogue de sélection de quêtes
      if (this.questUI) {
        this.questUI.showQuestDialog(
          data.npcName || 'Donneur de quêtes',
          availableQuests,
          (selectedQuestId) => this.startQuestFromDialog(selectedQuestId)
        );
        return true;
      }
      
      // Fallback: commencer automatiquement la première quête
      if (availableQuests.length === 1) {
        this.startQuest(availableQuests[0].id);
        return true;
      }
      
      console.warn('⚠️ [QuestManager] QuestUI non disponible pour dialogue');
      return false;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur quest giver interaction:', error);
      return false;
    }
  }
  
  handleQuestCompletionInteraction(data) {
    console.log('✅ [QuestManager] Interaction complétion quête:', data);
    
    try {
      // Marquer la quête comme terminée
      const quest = this.getQuestById(data.questId);
      if (quest) {
        // Déclencher événement de complétion
        if (this.onQuestCompleted) {
          this.onQuestCompleted({
            quest: quest,
            rewards: data.rewards || [],
            experience: data.experience || 0
          });
        }
        
        // Supprimer de actives, ajouter à completed
        this.activeQuests = this.activeQuests.filter(q => q.id !== data.questId);
        this.completedQuests.push(quest);
        
        // Mettre à jour stats
        this.calculateStats();
        
        // Notifier UI
        if (this.onStatsUpdate) {
          this.onStatsUpdate(this.questStats);
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur quest completion:', error);
      return false;
    }
  }
  
  handleQuestProgressInteraction(data) {
    console.log('📈 [QuestManager] Interaction progression quête:', data);
    
    try {
      if (data.questUpdates && Array.isArray(data.questUpdates)) {
        data.questUpdates.forEach(update => {
          if (this.onQuestProgress) {
            this.onQuestProgress(update);
          }
        });
        
        // Demander mise à jour des données
        setTimeout(() => {
          this.requestQuestData();
        }, 500);
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur quest progress:', error);
      return false;
    }
  }
  
  handleAvailableQuestsInteraction(data) {
    console.log('📋 [QuestManager] Interaction quêtes disponibles:', data);
    
    try {
      const quests = this.parseAvailableQuests(data.availableQuests);
      
      if (quests.length === 0) {
        return 'NO_QUEST';
      }
      
      // Sauvegarder les quêtes disponibles
      this.availableQuests = quests;
      
      // Si une seule quête, proposer directement
      if (quests.length === 1) {
        return this.showSingleQuestDialog(data.npcName, quests[0]);
      }
      
      // Plusieurs quêtes, montrer dialogue de choix
      return this.showMultipleQuestDialog(data.npcName, quests);
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur available quests:', error);
      return false;
    }
  }
  
  handleActiveQuestNpcInteraction(data) {
    console.log('🔄 [QuestManager] Interaction quête active avec NPC:', data);
    
    try {
      // Chercher des quêtes actives impliquant ce NPC
      const relatedQuests = this.activeQuests.filter(quest => {
        return this.questInvolvesNpc(quest, data.npcId, data.npcName);
      });
      
      if (relatedQuests.length > 0) {
        // Afficher info sur les quêtes en cours
        return this.showActiveQuestInfo(data.npcName, relatedQuests);
      }
      
      return 'NO_QUEST';
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur active quest NPC:', error);
      return false;
    }
  }
  
  // === 🎭 DIALOGUES QUÊTES ===
  
  showSingleQuestDialog(npcName, quest) {
    console.log('💬 [QuestManager] Dialogue quête unique:', quest);
    
    if (!this.questUI) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      return false;
    }
    
    const questTitle = `${npcName || 'NPC'} - Nouvelle quête`;
    
    this.questUI.showQuestDialog(
      questTitle,
      [quest],
      (selectedQuestId) => this.startQuestFromDialog(selectedQuestId)
    );
    
    return true;
  }
  
  showMultipleQuestDialog(npcName, quests) {
    console.log('💬 [QuestManager] Dialogue quêtes multiples:', quests);
    
    if (!this.questUI) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      return false;
    }
    
    const questTitle = `${npcName || 'NPC'} - Choisir une quête`;
    
    this.questUI.showQuestDialog(
      questTitle,
      quests,
      (selectedQuestId) => this.startQuestFromDialog(selectedQuestId)
    );
    
    return true;
  }
  
  showActiveQuestInfo(npcName, relatedQuests) {
    console.log('📖 [QuestManager] Info quêtes actives:', relatedQuests);
    
    // Créer un message informatif
    const questNames = relatedQuests.map(q => q.name).join(', ');
    const message = `Vous avez des quêtes en cours avec ${npcName}: ${questNames}`;
    
    // Afficher via le système de notifications
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'info', { duration: 3000 });
    }
    
    return true;
  }
  
  startQuestFromDialog(questId) {
    console.log('🚀 [QuestManager] Démarrage quête depuis dialogue:', questId);
    
    try {
      // Démarrer la quête
      this.startQuest(questId);
      
      // Notification
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification('Nouvelle quête acceptée !', 'success', { duration: 2000 });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur start quest from dialog:', error);
      return false;
    }
  }
  
  // === 🔍 UTILITAIRES NPC ===
  
  findQuestsForNpc(npcData) {
    const npcId = npcData.id;
    const npcName = npcData.name;
    
    return this.activeQuests.filter(quest => {
      return this.questInvolvesNpc(quest, npcId, npcName);
    });
  }
  
  questInvolvesNpc(quest, npcId, npcName) {
    if (!quest || !quest.steps) return false;
    
    // Vérifier dans les étapes de la quête
    return quest.steps.some(step => {
      // Vérifier les objectifs
      if (step.objectives) {
        return step.objectives.some(obj => {
          return (
            obj.targetNpcId === npcId ||
            obj.targetNpc === npcName ||
            obj.npcId === npcId ||
            obj.npc === npcName
          );
        });
      }
      
      // Vérifier directement dans l'étape
      return (
        step.npcId === npcId ||
        step.npc === npcName ||
        step.targetNpcId === npcId ||
        step.targetNpc === npcName
      );
    });
  }
  
  showQuestDialog(npcData, quests) {
    console.log('🎭 [QuestManager] Affichage dialogue quêtes:', npcData, quests);
    
    if (!this.questUI) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible pour dialogue');
      return false;
    }
    
    const npcName = npcData.name || 'NPC';
    const dialogTitle = `${npcName} - Quêtes`;
    
    this.questUI.showQuestDialog(
      dialogTitle,
      quests,
      (selectedQuestId) => {
        console.log('✅ [QuestManager] Quête sélectionnée:', selectedQuestId);
        this.startQuestFromDialog(selectedQuestId);
      }
    );
    
    return true;
  }
  
  // === 🔗 CONNEXION AVEC QUESTUI ===
  
  connectQuestUI(questUI) {
    console.log('🔗 [QuestManager] Connexion avec QuestUI');
    this.questUI = questUI;
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
    this.questUI = null;
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
      hasQuestUI: !!this.questUI,
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
📖 === QUEST MANAGER COMPLET AVEC NPC INTERACTION ===

✅ NOUVELLES MÉTHODES:
• handleNpcInteraction(data) - Point d'entrée pour interactions NPCs
• processNpcInteractionData(data) - Traite données complètes
• processNpcData(npcData) - Traite données NPC directes
• handleQuestGiverInteraction(data) - NPCs donneurs de quêtes
• handleQuestCompletionInteraction(data) - Complétion quêtes
• handleQuestProgressInteraction(data) - Progression quêtes
• handleAvailableQuestsInteraction(data) - Quêtes disponibles
• handleActiveQuestNpcInteraction(data) - Quêtes actives avec NPC

🎭 DIALOGUES QUÊTES:
• showSingleQuestDialog(npcName, quest) - Une quête
• showMultipleQuestDialog(npcName, quests) - Choix multiple
• showActiveQuestInfo(npcName, quests) - Info quêtes actives
• startQuestFromDialog(questId) - Démarrage depuis dialogue

🔍 UTILITAIRES NPC:
• findQuestsForNpc(npcData) - Trouve quêtes pour NPC
• questInvolvesNpc(quest, npcId, npcName) - Vérifie implication NPC
• showQuestDialog(npcData, quests) - Affiche dialogue général
• connectQuestUI(questUI) - Connecte l'interface

📡 FLUX INTERACTION:
1. InteractionManager → handleNpcInteraction(data)
2. Analyse type interaction (questGiver, questComplete, etc.)
3. Traite selon le type
4. Affiche dialogue approprié via QuestUI
5. Retourne true/false/'NO_QUEST'

🎯 RETOURS POSSIBLES:
• true - Interaction gérée avec succès
• false - Erreur dans le traitement
• 'NO_QUEST' - Aucune quête pour ce NPC (dialogue normal)

✅ QUEST MANAGER MAINTENANT COMPATIBLE AVEC NPCS !
`);
