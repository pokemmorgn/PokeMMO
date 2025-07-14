// client/src/Quest/QuestManager.js - RÉÉCRITURE COMPLÈTE
// Aligné avec le QuestManager serveur + QuestHandlers + ServiceRegistry
// ✅ CORRIGÉ: Quest-NPC Matching pour affichage automatique des quêtes

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
    this.onQuestUpdate = null;        // Quand quêtes actives changent
    this.onQuestStarted = null;       // Quand une quête démarre
    this.onQuestCompleted = null;     // Quand une quête se termine
    this.onQuestProgress = null;      // Lors de progression
    this.onStatsUpdate = null;        // Quand stats changent
    
    // === ÉTAT SYSTÈME ===
    this.initialized = false;
    this.questUI = null;              // Référence vers QuestUI
    this.lastDataRequest = 0;
    this.requestCooldown = 1000;      // 1 seconde entre requêtes
    
    // === DÉDUPLICATION ===
    this.lastNotificationTime = new Map();
    this.notificationCooldown = 2000; // 2 secondes
    
    // === CACHE NPC INTERACTION ===
    this.pendingNpcInteraction = null;
    this.npcInteractionTimeout = 5000; // 5 secondes timeout
    
    console.log('📖 [QuestManager] Instance créée - Version serveur modulaire');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestManager] Initialisation...');
      
      if (!this.gameRoom) {
        throw new Error('GameRoom requis pour QuestManager');
      }
      
      this.setupServerListeners();
      this.verifyConnections();
      
      // Demande initiale de données après un délai
      setTimeout(() => {
        this.requestInitialData();
      }, 500);
      
      this.initialized = true;
      console.log('✅ [QuestManager] Initialisé avec serveur modulaire');
      
      return this;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 📡 COMMUNICATION SERVEUR ===
  
  setupServerListeners() {
    if (!this.gameRoom || typeof this.gameRoom.onMessage !== 'function') {
      console.error('❌ [QuestManager] GameRoom invalide');
      return;
    }

    console.log('📡 [QuestManager] Configuration listeners serveur modulaire...');

    // === LISTENERS PRINCIPAUX (alignés avec QuestHandlers.ts) ===
    
    // Quêtes actives
    this.gameRoom.onMessage("activeQuestsList", (data) => {
      console.log('📋 [QuestManager] activeQuestsList reçu:', data);
      this.handleActiveQuestsReceived(data);
    });

    // Quêtes disponibles
    this.gameRoom.onMessage("availableQuestsList", (data) => {
      console.log('📋 [QuestManager] availableQuestsList reçu:', data);
      this.handleAvailableQuestsReceived(data);
    });

    // Résultat de démarrage de quête
    this.gameRoom.onMessage("questStartResult", (data) => {
      console.log('🎯 [QuestManager] questStartResult reçu:', data);
      this.handleQuestStartResult(data);
    });

    // Quête accordée automatiquement
    this.gameRoom.onMessage("questGranted", (data) => {
      console.log('🎁 [QuestManager] questGranted reçu:', data);
      this.handleQuestGranted(data);
    });

    // Progression de quête
    this.gameRoom.onMessage("questProgressUpdate", (data) => {
      console.log('📈 [QuestManager] questProgressUpdate reçu:', data);
      this.handleQuestProgressUpdate(data);
    });

    // Quête terminée
    this.gameRoom.onMessage("questCompleted", (data) => {
      console.log('🎉 [QuestManager] questCompleted reçu:', data);
      this.handleQuestCompleted(data);
    });

    // Statuts de quêtes (pour NPCs)
    this.gameRoom.onMessage("questStatuses", (data) => {
      console.log('📊 [QuestManager] questStatuses reçu:', data);
      this.handleQuestStatuses(data);
    });

    // === LISTENERS SPÉCIAUX ===
    
    // Séquence d'intro (aligné avec QuestHandlers)
    this.gameRoom.onMessage("triggerIntroSequence", (data) => {
      console.log('🎬 [QuestManager] triggerIntroSequence reçu:', data);
      this.handleIntroSequence(data);
    });

    // Quête d'intro terminée
    this.gameRoom.onMessage("introQuestCompleted", (data) => {
      console.log('🎓 [QuestManager] introQuestCompleted reçu:', data);
      this.handleIntroQuestCompleted(data);
    });

    // Debug info
    this.gameRoom.onMessage("questDebugInfo", (data) => {
      console.log('🐛 [QuestManager] questDebugInfo reçu:', data);
      this.handleQuestDebugInfo(data);
    });

    console.log('✅ [QuestManager] Listeners serveur configurés');
  }
  
  verifyConnections() {
    console.log('🔍 [QuestManager] Vérification connexions...');
    
    if (!this.gameRoom) {
      console.error('❌ [QuestManager] Pas de gameRoom');
      return false;
    }
    
    if (typeof this.gameRoom.send !== 'function') {
      console.error('❌ [QuestManager] gameRoom.send non disponible');
      return false;
    }
    
    console.log('✅ [QuestManager] Connexions vérifiées');
    return true;
  }
  
  requestInitialData() {
    if (!this.canSendRequest()) {
      console.log('⏳ [QuestManager] Cooldown actif, report requête');
      setTimeout(() => this.requestInitialData(), this.requestCooldown);
      return;
    }
    
    console.log('📤 [QuestManager] Demande données initiales...');
    
    try {
      // Demander quêtes actives
      this.gameRoom.send("getActiveQuests");
      
      // Notifier que le client est prêt pour l'intro
      this.gameRoom.send("clientIntroReady");
      
      this.lastDataRequest = Date.now();
      console.log('✅ [QuestManager] Requêtes initiales envoyées');
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur envoi requêtes:', error);
    }
  }
  
  canSendRequest() {
    const now = Date.now();
    return (now - this.lastDataRequest) > this.requestCooldown;
  }
  
  // === 📊 HANDLERS DONNÉES ===
  
  handleActiveQuestsReceived(data) {
    try {
      console.log('📊 [QuestManager] Traitement quêtes actives:', data);
      
      let questArray = [];
      
      if (data && data.quests && Array.isArray(data.quests)) {
        questArray = data.quests;
      } else if (Array.isArray(data)) {
        questArray = data;
      } else {
        console.warn('⚠️ [QuestManager] Format données inattendu:', data);
        questArray = [];
      }
      
      // Nettoyer et valider
      this.activeQuests = questArray.filter(quest => {
        if (!quest || (!quest.id && !quest._id)) {
          console.warn('⚠️ [QuestManager] Quête sans ID ignorée:', quest);
          return false;
        }
        return true;
      });
      
      console.log(`📊 [QuestManager] ${this.activeQuests.length} quêtes actives parsées`);
      
      // Mettre à jour stats
      this.calculateStats();
      
      // Déclencher callbacks
      this.triggerCallbacks();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleActiveQuests:', error);
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
      
      this.availableQuests = questArray.filter(quest => quest && (quest.id || quest._id));
      console.log(`📊 [QuestManager] ${this.availableQuests.length} quêtes disponibles parsées`);
      
      // Traiter interaction NPC en attente
      this.processPendingNpcInteraction();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleAvailableQuests:', error);
    }
  }
  
  calculateStats() {
    this.questStats.totalActive = this.activeQuests.length;
    this.questStats.newQuests = this.activeQuests.filter(q => q.isNew).length;
    this.questStats.readyToComplete = this.activeQuests.filter(q => 
      q.status === 'readyToComplete' || q.currentStepIndex >= (q.steps?.length || 0)
    ).length;
    
    console.log('📊 [QuestManager] Stats calculées:', this.questStats);
  }
  
  triggerCallbacks() {
    if (this.onQuestUpdate && typeof this.onQuestUpdate === 'function') {
      try {
        this.onQuestUpdate(this.activeQuests);
      } catch (error) {
        console.error('❌ [QuestManager] Erreur callback onQuestUpdate:', error);
      }
    }
    
    if (this.onStatsUpdate && typeof this.onStatsUpdate === 'function') {
      try {
        this.onStatsUpdate(this.questStats);
      } catch (error) {
        console.error('❌ [QuestManager] Erreur callback onStatsUpdate:', error);
      }
    }
  }
  
  // === 🎬 HANDLERS ÉVÉNEMENTS ===
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestManager] Résultat démarrage quête:', data);
    
    if (data.success) {
      this.showNotification(`Quête "${data.quest?.name || 'Inconnue'}" acceptée !`, 'success');
      
      if (this.onQuestStarted) {
        try {
          this.onQuestStarted(data.quest);
        } catch (error) {
          console.error('❌ [QuestManager] Erreur callback onQuestStarted:', error);
        }
      }
      
      // Rafraîchir données
      setTimeout(() => this.requestQuestData(), 500);
    } else {
      this.showNotification(data.message || "Impossible de démarrer cette quête", 'error');
    }
  }
  
  handleQuestGranted(data) {
    console.log('🎁 [QuestManager] Quête accordée:', data);
    
    this.showNotification(`Nouvelle quête : ${data.questName || 'Inconnue'} !`, 'success');
    
    if (this.onQuestStarted) {
      try {
        this.onQuestStarted({
          id: data.questId,
          name: data.questName,
          granted: true
        });
      } catch (error) {
        console.error('❌ [QuestManager] Erreur callback questGranted:', error);
      }
    }
    
    // Rafraîchir données
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestProgressUpdate(data) {
    console.log('📈 [QuestManager] Progression quête:', data);
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ [QuestManager] Format progression invalide:', data);
      return;
    }
    
    // Traiter chaque résultat de progression
    data.forEach(result => {
      if (result.questCompleted && this.onQuestCompleted) {
        try {
          this.onQuestCompleted(result);
        } catch (error) {
          console.error('❌ [QuestManager] Erreur callback questCompleted:', error);
        }
      } else if (this.onQuestProgress) {
        try {
          this.onQuestProgress(result);
        } catch (error) {
          console.error('❌ [QuestManager] Erreur callback onQuestProgress:', error);
        }
      }
      
      // Notifications de progression
      if (result.objectiveCompleted) {
        this.showNotification(`Objectif complété : ${result.objectiveName}`, 'success');
      } else if (result.stepCompleted) {
        this.showNotification(`Étape terminée : ${result.stepName}`, 'success');
      } else if (result.questCompleted) {
        this.showNotification(`Quête terminée : ${result.questName} !`, 'success');
      }
    });
    
    // Rafraîchir données après progression
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestCompleted(data) {
    console.log('🎉 [QuestManager] Quête terminée:', data);
    
    this.showNotification(data.message || "Félicitations ! Quête terminée !", 'success');
    
    if (this.onQuestCompleted) {
      try {
        this.onQuestCompleted(data);
      } catch (error) {
        console.error('❌ [QuestManager] Erreur callback handleQuestCompleted:', error);
      }
    }
    
    // Rafraîchir données
    setTimeout(() => this.requestQuestData(), 500);
  }
  
  handleQuestStatuses(data) {
    console.log('📊 [QuestManager] Statuts quêtes NPCs:', data);
    
    // Déléguer aux NPCs pour affichage d'icônes
    if (data.questStatuses && Array.isArray(data.questStatuses)) {
      this.updateNpcQuestStatuses(data.questStatuses);
    }
  }
  
  updateNpcQuestStatuses(statuses) {
    // Notifier le système NPC des statuts de quêtes
    if (window.npcManager && window.npcManager.updateQuestStatuses) {
      window.npcManager.updateQuestStatuses(statuses);
    }
    
    // Broadcast événement global
    window.dispatchEvent(new CustomEvent('questStatusesUpdated', {
      detail: { statuses }
    }));
  }
  
  // === 🎬 HANDLERS SPÉCIAUX ===
  
  handleIntroSequence(data) {
    console.log('🎬 [QuestManager] Séquence d\'intro déclenchée:', data);
    
    if (data.shouldStartIntro) {
      // Déclencher la séquence d'intro
      this.triggerIntroSequence(data);
    }
  }
  
  triggerIntroSequence(data) {
    console.log('🎬 [QuestManager] Démarrage séquence intro...');
    
    // Notifier le serveur que l'intro commence
    if (this.gameRoom) {
      this.gameRoom.send("intro_started");
    }
    
    // Afficher le message d'intro via le système de dialogue
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
            
            // Notifier le serveur
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
  
  handleIntroQuestCompleted(data) {
    console.log('🎓 [QuestManager] Quête d\'intro terminée:', data);
    
    this.showNotification(data.message || "Félicitations ! Vous avez terminé l'introduction !", 'success');
  }
  
  handleQuestDebugInfo(data) {
    console.log('🐛 [QuestManager] Debug info reçue:', data);
    // Pour debugging développement
  }
  
  // === 🗣️ INTERACTION NPC (NOUVELLE MÉTHODE PRINCIPALE) ===
  
  /**
   * Point d'entrée principal pour interactions NPCs depuis InteractionManager
   * Retourne: true (géré), false (erreur), 'NO_QUEST' (pas de quête)
   */
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] === INTERACTION NPC ===');
    console.log('📊 [QuestManager] Data reçue:', data);
    
    try {
      // Cas 1: Données complètes d'interaction
      if (data && typeof data === 'object' && data.type) {
        return this.processNpcInteractionData(data);
      }
      
      // Cas 2: NPC direct sans données spécifiques
      if (data && (data.npcId || data.id || data.name)) {
        return this.processNpcData(data);
      }
      
      // Cas 3: Pas de données - pas de quête
      console.log('ℹ️ [QuestManager] Aucune donnée NPC spécifique');
      return 'NO_QUEST';
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handleNpcInteraction:', error);
      return false;
    }
  }
  
  processNpcInteractionData(data) {
    console.log('📊 [QuestManager] Traitement données interaction complètes:', data.type);
    
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
  
  processNpcData(npcData) {
    console.log('🎯 [QuestManager] Traitement NPC direct:', npcData);
    
    // Chercher des quêtes actives avec ce NPC
    const npcQuests = this.findQuestsForNpc(npcData);
    
    if (npcQuests.length > 0) {
      return this.showQuestDialog(npcData, npcQuests);
    }
    
    // Pas de quête pour ce NPC
    console.log('ℹ️ [QuestManager] Aucune quête pour ce NPC');
    return 'NO_QUEST';
  }
  
  handleQuestGiverInteraction(data) {
    console.log('🎁 [QuestManager] Quest Giver détecté:', data);
    
    if (data.availableQuests && Array.isArray(data.availableQuests) && data.availableQuests.length > 0) {
      // Quêtes disponibles explicites
      return this.showQuestSelectionDialog(data.npcName, data.availableQuests);
    } else {
      // Demander les quêtes disponibles au serveur
      console.log('📤 [QuestManager] Demande quêtes disponibles...');
      this.requestAvailableQuestsForNpc(data);
      return true; // Interaction gérée (en attente)
    }
  }
  
  handleQuestCompleteInteraction(data) {
    console.log('✅ [QuestManager] Quest Complete détectée:', data);
    
    // Afficher dialogue de récompense
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
  
  // === 🎭 DIALOGUES QUÊTES ===
  
  showQuestSelectionDialog(npcName, quests) {
    console.log('💬 [QuestManager] Dialogue sélection quêtes:', npcName, quests);
    
    if (!this.questUI || !this.questUI.showQuestDialog) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      // Fallback: démarrer automatiquement la première quête
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
  
  showQuestDialog(npcData, quests) {
    console.log('🎭 [QuestManager] Dialogue quêtes génériques:', npcData, quests);
    
    if (!this.questUI) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      return false;
    }
    
    const npcName = npcData.name || 'NPC';
    this.questUI.showQuestDialog(
      `${npcName} - Quêtes`,
      quests,
      (selectedQuestId) => {
        this.startQuest(selectedQuestId);
      }
    );
    
    return true;
  }
  
  // === 📤 ACTIONS SERVEUR ===
  
  requestQuestData() {
    if (!this.canSendRequest()) {
      console.log('⏳ [QuestManager] Cooldown actif');
      return;
    }
    
    console.log('📤 [QuestManager] Demande données quêtes...');
    
    try {
      this.gameRoom.send("getActiveQuests");
      this.lastDataRequest = Date.now();
    } catch (error) {
      console.error('❌ [QuestManager] Erreur demande données:', error);
    }
  }
  
  requestAvailableQuests() {
    if (!this.canSendRequest()) return;
    
    console.log('📤 [QuestManager] Demande quêtes disponibles...');
    
    try {
      this.gameRoom.send("getAvailableQuests");
      this.lastDataRequest = Date.now();
    } catch (error) {
      console.error('❌ [QuestManager] Erreur demande disponibles:', error);
    }
  }
  
  requestAvailableQuestsForNpc(npcData) {
    console.log('📤 [QuestManager] Demande quêtes pour NPC:', npcData);
    
    // Stocker pour traitement ultérieur
    this.pendingNpcInteraction = {
      npcData,
      timestamp: Date.now()
    };
    
    // Nettoyer après timeout
    setTimeout(() => {
      if (this.pendingNpcInteraction && 
          this.pendingNpcInteraction.timestamp === this.pendingNpcInteraction.timestamp) {
        console.log('⏰ [QuestManager] Timeout interaction NPC');
        this.pendingNpcInteraction = null;
      }
    }, this.npcInteractionTimeout);
    
    this.requestAvailableQuests();
  }
  
  // ✅ MÉTHODE CORRIGÉE: processPendingNpcInteraction
  processPendingNpcInteraction() {
    if (!this.pendingNpcInteraction) {
      console.log('ℹ️ [QuestManager] Aucune interaction NPC en attente');
      return;
    }
    
    console.log('🔄 [QuestManager] Traitement interaction NPC en attente');
    console.log('📊 [QuestManager] Quêtes disponibles totales:', this.availableQuests.length);
    
    const { npcData } = this.pendingNpcInteraction;
    this.pendingNpcInteraction = null;
    
    // ✅ Log détaillé pour debug
    console.log('🎯 [QuestManager] NPC Data pour matching:', npcData);
    
    // Filtrer quêtes pour ce NPC avec debug détaillé
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
      
      // ✅ CORRECTION: Fallback - afficher toutes les quêtes disponibles si aucune correspondance
      if (this.availableQuests.length > 0) {
        console.log('🔄 [QuestManager] Fallback: affichage de toutes les quêtes disponibles');
        this.showQuestSelectionDialog(
          (npcData.npcName || npcData.name || 'NPC') + ' (Toutes les quêtes)',
          this.availableQuests
        );
      }
    }
  }
  
  // ✅ MÉTHODE CORRIGÉE: questMatchesNpc
  questMatchesNpc(quest, npcData) {
    console.log('🔍 [QuestManager] Vérification matching quest-NPC:', {
      questName: quest.name,
      questId: quest.id,
      npcData: npcData
    });
    
    // ✅ CORRECTION 1: Extraire les identifiants NPC correctement
    const npcId = npcData.npcId || npcData.id || npcData.targetId;
    const npcName = npcData.npcName || npcData.name;
    
    console.log('🎯 [QuestManager] Identifiants NPC:', {
      npcId: npcId,
      npcName: npcName,
      npcIdType: typeof npcId
    });
    
    console.log('🎯 [QuestManager] Identifiants Quest:', {
      startNpcId: quest.startNpcId,
      endNpcId: quest.endNpcId,
      npcId: quest.npcId,
      questId: quest.id
    });
    
    // ✅ CORRECTION 2: Vérifications multiples et plus permissives
    
    // Vérification 1: NPCs de début/fin directs
    if (quest.startNpcId && quest.startNpcId == npcId) {
      console.log('✅ [QuestManager] Match trouvé: startNpcId');
      return true;
    }
    
    if (quest.endNpcId && quest.endNpcId == npcId) {
      console.log('✅ [QuestManager] Match trouvé: endNpcId');
      return true;
    }
    
    if (quest.npcId && quest.npcId == npcId) {
      console.log('✅ [QuestManager] Match trouvé: quest.npcId');
      return true;
    }
    
    // Vérification 2: Par nom (case insensitive)
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
    
    // ✅ CORRECTION 3: Vérification dans les étapes
    if (quest.steps && Array.isArray(quest.steps)) {
      for (const step of quest.steps) {
        if (step.objectives && Array.isArray(step.objectives)) {
          for (const obj of step.objectives) {
            // Vérifications objectives
            if ((obj.targetNpcId && obj.targetNpcId == npcId) ||
                (obj.npcId && obj.npcId == npcId) ||
                (obj.target && obj.target == npcId) ||
                (obj.target && obj.target == npcId.toString()) ||
                (npcName && obj.targetNpc && obj.targetNpc.toLowerCase() === npcName.toLowerCase()) ||
                (npcName && obj.npc && obj.npc.toLowerCase() === npcName.toLowerCase())) {
              console.log('✅ [QuestManager] Match trouvé: dans objectif step');
              return true;
            }
          }
        }
      }
    }
    
    // ✅ CORRECTION 4: Fallback - si pas de restrictions NPC spécifiques, autoriser
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
      console.log('✅ [QuestManager] Match trouvé: quête générique (pas de restrictions NPC)');
      return true;
    }
    
    console.log('❌ [QuestManager] Aucun match trouvé pour cette quête');
    return false;
  }
  
  startQuest(questId) {
    if (!this.canSendRequest()) return;
    
    console.log('🎯 [QuestManager] Démarrage quête:', questId);
    
    try {
      this.gameRoom.send("startQuest", { questId });
      this.lastDataRequest = Date.now();
    } catch (error) {
      console.error('❌ [QuestManager] Erreur démarrage quête:', error);
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
  
  triggerProgress(data) {
    if (!this.canSendRequest()) return;
    
    console.log('📈 [QuestManager] Déclenchement progression:', data);
    
    try {
      this.gameRoom.send("questProgress", data);
      this.lastDataRequest = Date.now();
    } catch (error) {
      console.error('❌ [QuestManager] Erreur progression:', error);
    }
  }
  
  debugQuests() {
    if (!this.canSendRequest()) return;
    
    console.log('🐛 [QuestManager] Debug quêtes...');
    
    try {
      this.gameRoom.send("debugPlayerQuests");
      this.lastDataRequest = Date.now();
    } catch (error) {
      console.error('❌ [QuestManager] Erreur debug:', error);
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
  
  // === 🔍 UTILITAIRES ===
  
  findQuestsForNpc(npcData) {
    const npcId = npcData.npcId || npcData.id;
    const npcName = npcData.npcName || npcData.name;
    
    return this.activeQuests.filter(quest => {
      return this.questInvolvesNpc(quest, npcId, npcName);
    });
  }
  
  questInvolvesNpc(quest, npcId, npcName) {
    if (!quest || !quest.steps) return false;
    
    // Vérifier NPCs de début/fin
    if (quest.startNpcId === npcId || quest.endNpcId === npcId) {
      return true;
    }
    
    // Vérifier dans les étapes
    return quest.steps.some(step => {
      if (step.objectives) {
        return step.objectives.some(obj => {
          return (
            obj.targetNpcId === npcId ||
            obj.targetNpc === npcName ||
            obj.npcId === npcId ||
            obj.npc === npcName ||
            obj.target === npcId.toString()
          );
        });
      }
      return false;
    });
  }
  
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
  
  // === 🔗 CONNEXION AVEC QUESTUI ===
  
  connectQuestUI(questUI) {
    console.log('🔗 [QuestManager] Connexion avec QuestUI');
    this.questUI = questUI;
    
    // Mise à jour immédiate si des données existent
    if (this.activeQuests.length > 0 && questUI.updateQuestData) {
      questUI.updateQuestData(this.activeQuests, 'active');
    }
  }
  
  // === 🐛 MÉTHODE DEBUG BONUS ===
  
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
      totalCompleted: this.questStats.totalCompleted,
      initialized: this.initialized,
      hasUI: !!this.questUI
    };
  }
  
  // === 🔧 UTILITAIRES ===
  
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
  
  setConfig(config) {
    this.config = { ...this.config, ...config };
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
      callbacks: {
        onQuestUpdate: !!this.onQuestUpdate,
        onQuestStarted: !!this.onQuestStarted,
        onQuestCompleted: !!this.onQuestCompleted,
        onQuestProgress: !!this.onQuestProgress,
        onStatsUpdate: !!this.onStatsUpdate
      },
      questAnalysis: this.getQuestAnalysis(),
      availableQuestsCount: this.availableQuests.length,
      notificationCacheSize: this.lastNotificationTime.size
    };
  }
  
  logDebugInfo() {
    console.log('🐛 [QuestManager] === DEBUG INFO ===', this.getDebugInfo());
  }
}

export default QuestManager;
