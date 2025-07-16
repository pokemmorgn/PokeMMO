// client/src/Quest/QuestManager.js
// 🎯 VERSION ULTRA-SIMPLIFIÉE - GARDE TON UIMANAGER
// ✅ Objectif : Juste recevoir/envoyer des messages, pas plus

export class QuestManager {
  constructor() {
    // === ÉTAT MINIMAL ===
    this.gameRoom = null;
    this.isReady = false;
    
    // === DONNÉES ===
    this.activeQuests = [];
    this.availableQuests = [];
    
    // === HANDLERS ENREGISTRÉS ===
    this.handlersRegistered = false;
    
    console.log('📖 [QuestManager] Version ultra-simple créée');
  }

  // ✅ SETUP SIMPLE - UNE SEULE MÉTHODE PUBLIQUE
  setup(gameRoom) {
    console.log('🔧 [QuestManager] Setup avec gameRoom...');
    
    if (!gameRoom) {
      throw new Error('GameRoom requise');
    }
    
    this.gameRoom = gameRoom;
    
    // ✅ Enregistrer handlers immédiatement
    this.registerHandlers();
    
    // ✅ Demander données
    this.requestInitialData();
    
    // ✅ AUTO-ENREGISTREMENT GLOBAL
    window.questManager = this;
    
    // ✅ ENREGISTREMENT DANS UIMANAGER SI EXISTE
    if (window.uiManager && window.uiManager.modules) {
      const questModule = window.uiManager.modules.get('quest');
      if (questModule && questModule.instance) {
        questModule.instance.manager = this;
        console.log('✅ [QuestManager] Enregistré dans UIManager');
      }
    }
    
    this.isReady = true;
    console.log('✅ [QuestManager] Setup terminé et enregistré globalement');
  }

  // ✅ HANDLERS ULTRA-SIMPLES
  registerHandlers() {
    if (this.handlersRegistered) {
      console.log('⚠️ [QuestManager] Handlers déjà enregistrés');
      return;
    }

    console.log('📡 [QuestManager] Enregistrement handlers...');

    // ✅ Handler 1 : Quêtes actives
    this.gameRoom.onMessage("activeQuestsList", (data) => {
      console.log('📥 [QuestManager] ✅ ACTIVES REÇUES!', data);
      this.activeQuests = this.extractQuests(data);
      this.notifyUIManager('activeQuests', this.activeQuests);
    });

    // ✅ Handler 2 : Quêtes disponibles  
    this.gameRoom.onMessage("availableQuestsList", (data) => {
      console.log('📥 [QuestManager] ✅ DISPONIBLES REÇUES!', data);
      this.availableQuests = this.extractQuests(data);
      this.notifyUIManager('availableQuests', this.availableQuests);
      
      // ✅ Si on a des quêtes disponibles, afficher dialogue
      if (this.availableQuests.length > 0) {
        this.showQuestSelection();
      }
    });

    // ✅ Handler 3 : Résultat démarrage quête
    this.gameRoom.onMessage("questStartResult", (data) => {
      console.log('📥 [QuestManager] ✅ RÉSULTAT DÉMARRAGE!', data);
      this.handleQuestStartResult(data);
    });

    // ✅ Handler 4 : Progression quête
    this.gameRoom.onMessage("questProgressUpdate", (data) => {
      console.log('📥 [QuestManager] ✅ PROGRESSION!', data);
      this.handleQuestProgress(data);
    });

    // ✅ Handler 5 : Statuts quêtes
    this.gameRoom.onMessage("questStatuses", (data) => {
      console.log('📥 [QuestManager] ✅ STATUTS!', data);
      this.notifyUIManager('questStatuses', data);
    });

    this.handlersRegistered = true;
    console.log('✅ [QuestManager] 5 handlers enregistrés');
  }

  // ✅ EXTRACTION SIMPLE DES QUÊTES
  extractQuests(data) {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.quests)) {
      return data.quests;
    }
    return [];
  }

  // ✅ NOTIFICATION UIMANAGER (garde ton système)
  notifyUIManager(type, data) {
    console.log(`📢 [QuestManager] Notify UIManager: ${type}`, data);
    
    // ✅ Utiliser ton UIManager existant
    if (window.uiManager && window.uiManager.modules) {
      const questModule = window.uiManager.modules.get('quest');
      if (questModule && questModule.instance) {
        // ✅ Déléguer à ton système UI qui marche
        questModule.instance.handleQuestUpdate(type, data);
      }
    }
    
    // ✅ Événements pour compatibilité
    window.dispatchEvent(new CustomEvent(`quest_${type}`, {
      detail: { type, data }
    }));
  }

  // ✅ AFFICHAGE SÉLECTION QUÊTE (délègue à UI)
  showQuestSelection() {
    console.log('🎭 [QuestManager] Demande affichage sélection quêtes');
    
    if (this.availableQuests.length === 0) {
      console.log('⚠️ [QuestManager] Aucune quête à afficher');
      return;
    }

    // ✅ Déléguer à ton UIManager
    this.notifyUIManager('showQuestSelection', {
      title: 'Quêtes disponibles',
      quests: this.availableQuests,
      onSelect: (questId) => this.startQuest(questId)
    });
  }

  // ✅ REQUÊTES SIMPLES
  requestInitialData() {
    console.log('📤 [QuestManager] Demande données initiales...');
    this.send('getActiveQuests');
    // Note: availableQuests sera demandé lors d'interaction NPC
  }

  requestAvailableQuests() {
    console.log('📤 [QuestManager] Demande quêtes disponibles...');
    this.send('getAvailableQuests');
  }

  startQuest(questId) {
    console.log(`🎯 [QuestManager] Démarrage quête: ${questId}`);
    this.send('startQuest', { questId });
  }

  // ✅ ENVOI MESSAGES
  send(messageType, data = null) {
    if (!this.gameRoom || !this.gameRoom.send) {
      console.error(`❌ [QuestManager] Cannot send ${messageType}`);
      return false;
    }

    try {
      console.log(`📤 [QuestManager] Send: ${messageType}`, data);
      this.gameRoom.send(messageType, data);
      return true;
    } catch (error) {
      console.error(`❌ [QuestManager] Error sending ${messageType}:`, error);
      return false;
    }
  }

  // ✅ HANDLERS DE RÉSULTATS
  handleQuestStartResult(data) {
    if (data.success) {
      console.log('✅ [QuestManager] Quête démarrée avec succès');
      this.showNotification(`Quête "${data.quest?.name}" acceptée !`, 'success');
      
      // ✅ Rafraîchir les quêtes actives
      setTimeout(() => this.send('getActiveQuests'), 500);
    } else {
      console.log('❌ [QuestManager] Échec démarrage quête');
      this.showNotification(data.message || 'Impossible de démarrer cette quête', 'error');
    }

    // ✅ Notifier UIManager
    this.notifyUIManager('questStartResult', data);
  }

  handleQuestProgress(data) {
    console.log('📈 [QuestManager] Progression quête:', data);
    
    if (Array.isArray(data)) {
      data.forEach(result => {
        if (result.questCompleted) {
          this.showNotification(`Quête terminée : ${result.questName} !`, 'success');
        } else if (result.objectiveCompleted) {
          this.showNotification(`Objectif complété : ${result.objectiveName}`, 'success');
        }
      });
    }

    // ✅ Rafraîchir après progression
    setTimeout(() => this.send('getActiveQuests'), 500);
    
    // ✅ Notifier UIManager
    this.notifyUIManager('questProgress', data);
  }

  // ✅ INTERACTION NPC (appelée depuis InteractionManager)
  handleNpcInteraction(npcData) {
    console.log('🗣️ [QuestManager] Interaction NPC pour quêtes:', npcData);
    
    // ✅ Vérifier si c'est lié aux quêtes
    if (this.isQuestRelated(npcData)) {
      console.log('🎯 [QuestManager] Interaction liée aux quêtes');
      
      // ✅ Si on a déjà des quêtes disponibles dans les données
      if (npcData.availableQuests && Array.isArray(npcData.availableQuests)) {
        console.log('📋 [QuestManager] Quêtes fournies directement');
        this.availableQuests = npcData.availableQuests;
        this.showQuestSelection();
        return 'QUESTS_SHOWN';
      } else {
        // ✅ Demander au serveur
        console.log('📤 [QuestManager] Demande quêtes au serveur');
        this.requestAvailableQuests();
        return 'REQUESTING_QUESTS';
      }
    }
    
    return 'NO_QUEST';
  }

  // ✅ DÉTECTION QUÊTE
  isQuestRelated(data) {
    if (!data) return false;
    
    return !!(
      data.type === 'questGiver' ||
      data.type === 'questComplete' ||
      data.questId ||
      data.availableQuests ||
      data.hasQuest === true
    );
  }

  // ✅ NOTIFICATIONS (garde ton système)
  showNotification(message, type = 'info') {
    if (window.showGameNotification) {
      window.showGameNotification(message, type, { duration: 3000 });
    } else {
      console.log(`📢 [QuestManager] ${type.toUpperCase()}: ${message}`);
    }
  }

  // ✅ API PUBLIQUE SIMPLE
  getActiveQuests() {
    return [...this.activeQuests];
  }

  getAvailableQuests() {
    return [...this.availableQuests];
  }

  isInitialized() {
    return this.isReady && this.handlersRegistered;
  }

  // ✅ DEBUG
  debug() {
    console.log('🔍 [QuestManager] === DEBUG ===');
    console.log('📊 État:', {
      isReady: this.isReady,
      handlersRegistered: this.handlersRegistered,
      hasGameRoom: !!this.gameRoom,
      activeQuests: this.activeQuests.length,
      availableQuests: this.availableQuests.length
    });
    
    if (this.gameRoom) {
      console.log('🔗 GameRoom:', {
        sessionId: this.gameRoom.sessionId,
        hasOnMessage: typeof this.gameRoom.onMessage === 'function',
        hasSend: typeof this.gameRoom.send === 'function'
      });
    }
  }

  // ✅ NETTOYAGE
  destroy() {
    console.log('🧹 [QuestManager] Destruction...');
    this.gameRoom = null;
    this.isReady = false;
    this.handlersRegistered = false;
    this.activeQuests = [];
    this.availableQuests = [];
  }
}

// ✅ USAGE SIMPLE
/*
// Dans ton code principal :
const questManager = new QuestManager();
questManager.setup(gameRoom);

// Dans InteractionManager pour les NPCs quêtes :
const result = questManager.handleNpcInteraction(npcData);

// Ton UIManager continue de marcher comme avant !
*/

// ✅ DEBUG GLOBAL
window.debugQuestManager = function() {
  if (window.questManager) {
    window.questManager.debug();
  } else {
    console.error('❌ QuestManager non trouvé');
  }
};

export default QuestManager;

console.log(`
📖 === QUEST MANAGER ULTRA-SIMPLE ===

✅ PRINCIPES:
1. UN SEUL FICHIER, UNE SEULE RESPONSABILITÉ
2. GARDE TON UIMANAGER QUI MARCHE
3. JUSTE RECEVOIR/ENVOYER DES MESSAGES
4. DÉLÉGUER L'AFFICHAGE À L'UI EXISTANTE

🎯 USAGE:
const qm = new QuestManager();
qm.setup(gameRoom);

📋 API:
- qm.handleNpcInteraction(data)
- qm.startQuest(questId)
- qm.getActiveQuests()
- qm.getAvailableQuests()

🔍 DEBUG:
window.debugQuestManager()
`);
