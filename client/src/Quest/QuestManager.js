// Quest/QuestManager.js - CORRECTIONS ANTI-BOUCLE

export class QuestManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    
    // === ÉTAT SYSTÈME SIMPLE ===
    this.systemState = 'UNINITIALIZED';
    this.dialogueState = 'NONE';
    this.initialized = false;
    
    // ✅ NOUVEAU: Protection anti-boucle
    this.pendingQuestRequest = false;
    this.lastInteractionTime = 0;
    
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
    this.networkManager = null;
    
    // === CONFIG ===
    this.config = {
      maxWaitTime: 10000,
      handlerRetryDelay: 500,
      maxHandlerRetries: 5,
      interactionCooldown: 1000 // ✅ NOUVEAU: Cooldown anti-spam
    };
    
    console.log('📖 [QuestManager] Instance créée - Version anti-boucle');
    
    if (gameRoom) {
      this.gameRoom = gameRoom;
      this.setState('WAITING_ROOM', 'GameRoom fournie');
    }
  }
  
  // === 📡 ENREGISTREMENT HANDLERS CORRIGÉ ===
  
  registerHandlers() {
    console.log('📡 [QuestManager] Enregistrement handlers...');
    
    try {
      this.gameRoom.onMessage("activeQuestsList", (data) => {
        this.handleActiveQuestsReceived(data);
      });
      
      // ✅ CORRECTION: Un seul handler pour availableQuestsList
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

      console.log('✅ [QuestManager] Handlers enregistrés (sans doublon)');
      this.setState('READY', 'Handlers enregistrés');
      this.requestInitialData();
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handlers:', error);
      this.setState('ERROR', 'Erreur handlers');
    }
  }
  
  // === 🗣️ INTERACTION NPC AVEC ANTI-BOUCLE ===
  
  handleNpcInteraction(data) {
    console.log('🗣️ [QuestManager] === INTERACTION NPC ===');
    console.log('📊 Data:', data);
    
    // ✅ PROTECTION ANTI-SPAM
    const now = Date.now();
    if (this.lastInteractionTime && (now - this.lastInteractionTime) < this.config.interactionCooldown) {
      console.log('🚫 [QuestManager] BLOQUÉ - Cooldown actif');
      return 'COOLDOWN';
    }
    this.lastInteractionTime = now;
    
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
        console.log(`✅ [QuestManager] ${data.availableQuests.length} quêtes reçues directement`);
        this.showQuestSelectionDialog('Choisir une quête', data.availableQuests);
        return 'QUESTS_SHOWN';
      } else {
        // ✅ PROTECTION: Pas de requête si déjà en cours
        if (this.pendingQuestRequest) {
          console.log('⏳ [QuestManager] Requête déjà en cours');
          return 'ALREADY_REQUESTING';
        }
        
        console.log('📤 [QuestManager] Demande quêtes au serveur...');
        this.pendingQuestRequest = true;
        this.requestAvailableQuests();
        return 'REQUESTING_QUESTS';
      }
    }
    
    if (data.type === 'questComplete') {
      console.log('✅ [QuestManager] Quest Complete');
      this.setDialogueState('SHOWING_COMPLETION');
      this.showNotification('Quête terminée ! Félicitations !', 'success');
      setTimeout(() => this.setDialogueState('NONE'), 3000);
      return 'QUEST_COMPLETED';
    }
    
    console.log('ℹ️ [QuestManager] Type non-quest ou format non reconnu');
    return 'NO_QUEST';
  }
  
  // === 📊 HANDLERS DONNÉES CORRIGÉS ===
  
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
      
      // ✅ CORRECTION: Afficher seulement si on attendait une réponse
      if (this.pendingQuestRequest && this.availableQuests.length > 0) {
        console.log('🎭 [QuestManager] Affichage quêtes disponibles (réponse attendue)');
        this.showQuestSelectionDialog('Quêtes disponibles', this.availableQuests);
      }
      
      // ✅ Reset du flag
      this.pendingQuestRequest = false;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur traitement quêtes disponibles:', error);
      this.pendingQuestRequest = false;
    }
  }
  
  // === 🎭 DIALOGUES AVEC PROTECTION ===
  
  showQuestSelectionDialog(title, quests) {
    console.log('💬 [QuestManager] Dialogue sélection:', title, quests);
    
    // ✅ PROTECTION: Pas de double dialogue
    if (this.dialogueState === 'SHOWING_QUEST_SELECTION') {
      console.log('⚠️ [QuestManager] Dialogue déjà ouvert');
      return false;
    }
    
    // === ÉTAT DIALOGUE ACTIF ===
    this.setDialogueState('SHOWING_QUEST_SELECTION');
    
    if (!this.questUI || !this.questUI.showQuestDialog) {
      console.warn('⚠️ [QuestManager] QuestUI non disponible');
      
      // Fallback: démarrer automatiquement la première quête
      if (quests.length === 1) {
        this.setDialogueState('NONE');
        this.startQuest(quests[0].id);
      } else if (quests.length > 1) {
        this.showSimpleQuestSelection(title, quests);
      } else {
        this.setDialogueState('NONE');
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
  
  showSimpleQuestSelection(title, quests) {
    console.log('📋 [QuestManager] Sélection simple fallback');
    
    const questList = quests.map((quest, index) => 
      `${index + 1}. ${quest.name || 'Quête sans nom'}`
    ).join('\n');
    
    this.showNotification(`${title}:\n${questList}\n(Première quête sélectionnée automatiquement)`, 'info');
    
    // Auto-select première quête après un délai
    setTimeout(() => {
      this.setDialogueState('NONE');
      if (quests.length > 0) {
        this.startQuest(quests[0].id);
      }
    }, 2000);
  }
  
  // === 🔧 RESET ÉTAT EN CAS D'ERREUR ===
  
  resetInteractionState() {
    console.log('🔄 [QuestManager] Reset état interaction');
    this.pendingQuestRequest = false;
    this.setDialogueState('NONE');
    this.lastInteractionTime = 0;
  }
  
  // === ✅ API POUR INTERACTIONMANAGER ===
  
  canHandleMoreInteractions() {
    return !this.pendingQuestRequest && this.dialogueState === 'NONE';
  }
  
  getInteractionResult(resultCode) {
    const results = {
      'QUESTS_SHOWN': 'success',
      'REQUESTING_QUESTS': 'pending',
      'ALREADY_REQUESTING': 'pending',
      'QUEST_COMPLETED': 'success',
      'BLOCKED': 'blocked',
      'COOLDOWN': 'blocked',
      'INVALID_DATA': 'error',
      'NO_QUEST': 'no_quest'
    };
    
    return results[resultCode] || 'unknown';
  }

  // === 🐛 DEBUG AMÉLIORÉ ===
  
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
      pendingQuestRequest: this.pendingQuestRequest,
      lastInteractionTime: this.lastInteractionTime,
      canHandleMoreInteractions: this.canHandleMoreInteractions(),
      networkManagerConnection: this.debugNetworkManagerConnection()
    };
  }

  // ... [RESTE DU CODE IDENTIQUE] ...
}
