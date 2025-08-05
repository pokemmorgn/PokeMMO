// Quest/QuestSystem.js - VERSION COMPLÈTE AVEC QUESTDELIVERYOVERLAY
// 📦 Système complet avec overlay de livraison intégré
// ✅ Connexions réseau pour livraison de quêtes + UI unifiée

export class QuestSystem {
  constructor(gameRoom, networkManager) {
    this.gameRoom = gameRoom;
    this.networkManager = networkManager;
    
    // === ÉTAT SIMPLE ===
    this.ready = false;
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    
    // === UI COMPOSANTS ===
    this.ui = null;
    this.icon = null;
    this.tracker = null;
    this.detailsUI = null;
    // ✅ NOUVEAU : QuestDeliveryOverlay
    this.deliveryOverlay = null;
    
    // === CALLBACKS ===
    this.onQuestUpdate = null;
    this.onQuestCompleted = null;
    this.onQuestStarted = null;
    // ✅ NOUVEAU : Callbacks livraison
    this.onQuestDelivery = null;
    this.onDeliveryComplete = null;
    this.onDeliveryFailed = null;
    
    // === ÉTAT LIVRAISON ===
    this.deliveryState = {
      currentDelivery: null,
      isDelivering: false,
      lastDeliveryTime: 0,
      deliveryHistory: []
    };
    
    console.log('📖 [QuestSystem] Instance créée avec QuestDeliveryOverlay');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [QuestSystem] Initialisation complète...');
      
      this.setupNetworkHandlers();
      await this.createUI();
      
      this.ready = true;
      console.log('✅ [QuestSystem] Prêt avec système de livraison complet !');
      
      return this;
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur init:', error);
      throw error;
    }
  }

  // === 🎨 INTERFACE UTILISATEUR COMPLÈTE ===
  
  async createUI() {
    try {
      await this.createIcon();
      await this.createMainUI();
      await this.createTracker();
      await this.createQuestDetailsUI();
      // ✅ NOUVEAU : Créer QuestDeliveryOverlay
      await this.createQuestDeliveryOverlay();
      
      console.log('🎨 [QuestSystem] UI complète créée avec overlay de livraison');
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur création UI:', error);
    }
  }
  
  async createIcon() {
    const { QuestIcon } = await import('./QuestIcon.js');
    
    const optionsManager = window.optionsSystem?.manager || 
                           window.optionsSystemGlobal?.manager ||
                           window.optionsSystem;
    
    this.icon = new QuestIcon(this, optionsManager);
    await this.icon.init();
    
    this.icon.onClick = () => {
      if (this.ui) {
        this.ui.toggle();
      }
    };
  }
  
  async createMainUI() {
    const { QuestUI } = await import('./QuestUI.js');
    this.ui = new QuestUI(this, this.gameRoom);
    await this.ui.init();
    
    this.ui.onAction = (action, data) => {
      this.handleUIAction(action, data);
    };
  }
  
  async createTracker() {
    this.tracker = this.ui;
    console.log('📊 [QuestSystem] Tracker référence ui configuré');
  }
  
  async createQuestDetailsUI() {
    const { QuestDetailsUI } = await import('./QuestDetailsUI.js');
    
    const optionsManager = window.optionsSystem?.manager || 
                           window.optionsSystemGlobal?.manager ||
                           window.optionsSystem;
    
    this.detailsUI = new QuestDetailsUI(this, optionsManager);
    await this.detailsUI.init();
    
    this.detailsUI.onQuestAccept = (questId, npcId, questData) => {
      this.handleQuestAcceptFromUI(questId, npcId, questData);
    };
    
    this.detailsUI.onClose = () => {
      console.log('📋 [QuestSystem] QuestDetailsUI fermé');
    };
    
    console.log('📋 [QuestSystem] QuestDetailsUI créé et connecté');
  }

  // ✅ NOUVELLE MÉTHODE : Créer QuestDeliveryOverlay
  async createQuestDeliveryOverlay() {
    try {
      const { QuestDeliveryOverlay } = await import('./QuestDeliveryOverlay.js');
      
      this.deliveryOverlay = new QuestDeliveryOverlay(this, this.networkManager);
      await this.deliveryOverlay.init();
      
      // ✅ Configurer callbacks delivery overlay
      this.deliveryOverlay.onDeliveryConfirm = (deliveryData, npcId) => {
        this.handleDeliveryConfirmFromOverlay(deliveryData, npcId);
      };
      
      this.deliveryOverlay.onClose = () => {
        console.log('🎁 [QuestSystem] QuestDeliveryOverlay fermé');
        this.deliveryState.currentDelivery = null;
        this.deliveryState.isDelivering = false;
      };
      
      console.log('🎁 [QuestSystem] QuestDeliveryOverlay créé et connecté');
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur création QuestDeliveryOverlay:', error);
      this.deliveryOverlay = null;
    }
  }
  
  // === 📡 HANDLERS RÉSEAU AVEC LIVRAISON ===
  
  setupNetworkHandlers() {
    if (!this.networkManager || !this.networkManager.room) {
      console.warn('⚠️ [QuestSystem] NetworkManager/room non disponible');
      return;
    }
    
    console.log('📡 [QuestSystem] Enregistrement handlers avec livraison...');
    
    // ✅ HANDLERS EXISTANTS
    this.networkManager.room.onMessage("questAcceptResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questAcceptResult:', data);
      this.handleQuestAcceptResult(data);
    });
    
    this.networkManager.room.onMessage("questDetailsResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questDetailsResult:', data);
    });
    
    this.networkManager.room.onMessage("questStatuses", (data) => {
      console.log('📨 [QuestSystem] REÇU questStatuses:', data);
    });
    
    this.networkManager.room.onMessage("questProgressUpdate", (data) => {
      console.log('📨 [QuestSystem] REÇU questProgressUpdate:', data);
      this.handleQuestProgressUpdate(data);
    });
    
    this.networkManager.room.onMessage("activeQuestsList", (data) => {
      console.log('📨 [QuestSystem] REÇU activeQuestsList:', data);
      this.handleActiveQuests(data);
    });
    
    this.networkManager.room.onMessage("availableQuestsList", (data) => {
      console.log('📨 [QuestSystem] REÇU availableQuestsList:', data);
      this.handleAvailableQuests(data);
    });
    
    this.networkManager.room.onMessage("questStartResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questStartResult:', data);
      this.handleQuestStartResult(data);
    });
    
    this.networkManager.room.onMessage("introQuestCompleted", (data) => {
      console.log('📨 [QuestSystem] REÇU introQuestCompleted:', data);
      this.handleIntroQuestCompleted(data);
    });
    
    this.networkManager.room.onMessage("questDebugInfo", (data) => {
      console.log('📨 [QuestSystem] REÇU questDebugInfo:', data);
      console.table(data);
    });
    
    // ✅ NOUVEAUX HANDLERS : Système de livraison
    this.networkManager.room.onMessage("questDelivery", (data) => {
      console.log('📨 [QuestSystem] REÇU questDelivery (données livraison):', data);
      this.handleQuestDeliveryData(data);
    });
    
    this.networkManager.room.onMessage("questDeliveryResult", (data) => {
      console.log('📨 [QuestSystem] REÇU questDeliveryResult (résultat livraison):', data);
      this.handleQuestDeliveryResult(data);
    });
    
    this.networkManager.room.onMessage("questDeliveryError", (data) => {
      console.log('📨 [QuestSystem] REÇU questDeliveryError:', data);
      this.handleQuestDeliveryError(data);
    });
    
    // ✅ HANDLER INTERACTION NPC pour compatibilité
    this.networkManager.room.onMessage("npcInteractionResult", (data) => {
      if (this.isQuestInteraction(data)) {
        console.log('📋 [QuestSystem] Interaction NPC quest détectée');
        
        // ✅ NOUVEAU : Vérifier si c'est une livraison
        if (this.isDeliveryInteraction(data)) {
          console.log('🎁 [QuestSystem] Interaction de livraison détectée');
          this.handleQuestDeliveryData(data);
        }
      }
    });
    
    console.log('📡 [QuestSystem] Handlers réseau avec livraison configurés');
  }

  // === 🎁 NOUVEAUX HANDLERS : SYSTÈME DE LIVRAISON ===

  /**
   * Handler pour données de livraison reçues du serveur
   * @param {Object} data - Données de livraison
   */
  handleQuestDeliveryData(data) {
    console.log('🎁 [QuestSystem] === TRAITEMENT DONNÉES LIVRAISON ===');
    console.log('📊 Data reçue:', data);
    
    if (!this.deliveryOverlay) {
      console.error('❌ [QuestSystem] QuestDeliveryOverlay non disponible');
      this.showMessage('Interface de livraison non disponible', 'error');
      return false;
    }
    
    try {
      // ✅ Extraire les données de livraison selon le format serveur
      const deliveryData = this.extractDeliveryData(data);
      
      if (!deliveryData || !deliveryData.items || deliveryData.items.length === 0) {
        console.warn('⚠️ [QuestSystem] Données de livraison invalides');
        this.showMessage('Aucun objet à livrer', 'warning');
        return false;
      }
      
      console.log('✅ [QuestSystem] Données de livraison extraites:', deliveryData);
      
      // ✅ Stocker l'état de livraison
      this.deliveryState.currentDelivery = deliveryData;
      this.deliveryState.isDelivering = false;
      this.deliveryState.lastDeliveryTime = Date.now();
      
      // ✅ Afficher l'overlay de livraison
      const success = this.deliveryOverlay.show(deliveryData);
      
      if (success) {
        console.log('✅ [QuestSystem] Overlay de livraison affiché');
        
        // ✅ Callback custom
        if (this.onQuestDelivery && typeof this.onQuestDelivery === 'function') {
          this.onQuestDelivery(deliveryData);
        }
        
        return true;
      } else {
        throw new Error('Échec affichage overlay');
      }
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur traitement données livraison:', error);
      this.showMessage(`Erreur livraison: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Extraire les données de livraison du message serveur
   * @param {Object} data - Données brutes du serveur
   * @returns {Object} Données formatées pour l'overlay
   */
  extractDeliveryData(data) {
    // ✅ Format 1 : Données directes de livraison
    if (data.deliveryData) {
      return {
        questId: data.questId || data.deliveryData.questId,
        npcId: data.npcId || data.deliveryData.npcId,
        items: data.deliveryData.items || [],
        canDeliverAll: data.deliveryData.canDeliverAll || false,
        message: data.message || 'Objets requis pour la quête'
      };
    }
    
    // ✅ Format 2 : Données dans contextualData
    if (data.contextualData && data.contextualData.deliveryData) {
      const delivery = data.contextualData.deliveryData;
      return {
        questId: data.questId || delivery.questId,
        npcId: data.npcId || delivery.npcId,
        items: delivery.items || [],
        canDeliverAll: delivery.canDeliverAll || false,
        message: data.message || 'Objets requis pour la quête'
      };
    }
    
    // ✅ Format 3 : Données dans unifiedInterface
    if (data.unifiedInterface && data.unifiedInterface.deliveryData) {
      const delivery = data.unifiedInterface.deliveryData;
      return {
        questId: data.questId || delivery.questId,
        npcId: data.npcId || delivery.npcId,
        items: delivery.items || [],
        canDeliverAll: delivery.canDeliverAll || false,
        message: data.message || 'Objets requis pour la quête'
      };
    }
    
    // ✅ Format 4 : Données à la racine (format simple)
    if (data.items && Array.isArray(data.items)) {
      return {
        questId: data.questId,
        npcId: data.npcId,
        items: data.items,
        canDeliverAll: data.canDeliverAll || false,
        message: data.message || 'Objets requis pour la quête'
      };
    }
    
    console.warn('⚠️ [QuestSystem] Format de données livraison non reconnu:', data);
    return null;
  }

  /**
   * Handler pour confirmation de livraison depuis l'overlay
   * @param {Object} deliveryData - Données de livraison
   * @param {string} npcId - ID du NPC
   */
  handleDeliveryConfirmFromOverlay(deliveryData, npcId) {
    console.log('🎯 [QuestSystem] === CONFIRMATION LIVRAISON DEPUIS OVERLAY ===');
    console.log('📊 Données:', deliveryData);
    console.log('🎭 NPC ID:', npcId);
    
    if (!this.networkManager) {
      console.error('❌ [QuestSystem] NetworkManager non disponible pour livraison');
      this.showMessage('Erreur réseau - impossible de livrer', 'error');
      return false;
    }
    
    try {
      // ✅ Marquer comme en cours de livraison
      this.deliveryState.isDelivering = true;
      
      // ✅ Feedback immédiat
      this.showMessage('Livraison en cours...', 'info', { duration: 2000 });
      
      // ✅ Créer la demande de livraison
      const deliveryRequest = {
        type: 'questDelivery',
        questId: deliveryData.questId,
        npcId: npcId,
        items: deliveryData.items.map(item => ({
          itemId: item.itemId,
          required: item.required,
          playerHas: item.playerHas
        })),
        timestamp: Date.now(),
        sessionId: this.networkManager.sessionId
      };
      
      console.log('📤 [QuestSystem] Envoi demande livraison:', deliveryRequest);
      
      // ✅ Envoyer au serveur via NetworkManager
      this.networkManager.sendMessage('questDelivery', deliveryRequest);
      
      // ✅ Callback custom
      if (this.onQuestDelivery && typeof this.onQuestDelivery === 'function') {
        this.onQuestDelivery(deliveryData, npcId);
      }
      
      console.log('✅ [QuestSystem] Demande de livraison envoyée');
      return true;
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur confirmation livraison:', error);
      this.deliveryState.isDelivering = false;
      this.showMessage(`Erreur livraison: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Handler pour résultat de livraison du serveur
   * @param {Object} data - Résultat de livraison
   */
  handleQuestDeliveryResult(data) {
    console.log('🎉 [QuestSystem] === RÉSULTAT LIVRAISON ===');
    console.log('📊 Data:', data);
    
    this.deliveryState.isDelivering = false;
    
    if (data.success) {
      // ✅ SUCCÈS
      const message = data.message || 'Objets livrés avec succès !';
      console.log('✅ [QuestSystem] Livraison réussie');
      
      // ✅ Notification de succès
      this.showMessage(message, 'success', { duration: 4000 });
      
      // ✅ Fermer l'overlay après un délai
      setTimeout(() => {
        if (this.deliveryOverlay) {
          this.deliveryOverlay.hide();
        }
      }, 2000);
      
      // ✅ Mettre à jour les quêtes actives
      setTimeout(() => {
        this.requestActiveQuests();
      }, 1000);
      
      // ✅ Animation icône
      if (this.icon) {
        this.icon.animateQuestCompleted();
      }
      
      // ✅ Callback custom
      if (this.onDeliveryComplete && typeof this.onDeliveryComplete === 'function') {
        this.onDeliveryComplete(data, this.deliveryState.currentDelivery);
      }
      
      // ✅ Historique
      this.deliveryState.deliveryHistory.push({
        ...this.deliveryState.currentDelivery,
        completedAt: Date.now(),
        result: 'success',
        serverResponse: data
      });
      
    } else {
      // ❌ ÉCHEC
      const errorMsg = data.message || data.error || 'Impossible de livrer les objets';
      console.error('❌ [QuestSystem] Livraison échouée:', errorMsg);
      
      this.showMessage(errorMsg, 'error', { duration: 5000 });
      
      // ✅ Callback custom
      if (this.onDeliveryFailed && typeof this.onDeliveryFailed === 'function') {
        this.onDeliveryFailed(data, this.deliveryState.currentDelivery);
      }
      
      // ✅ Historique
      this.deliveryState.deliveryHistory.push({
        ...this.deliveryState.currentDelivery,
        failedAt: Date.now(),
        result: 'failed',
        error: errorMsg,
        serverResponse: data
      });
    }
    
    // ✅ Reset état
    this.deliveryState.currentDelivery = null;
  }

  /**
   * Handler pour erreur de livraison
   * @param {Object} data - Données d'erreur
   */
  handleQuestDeliveryError(data) {
    console.error('❌ [QuestSystem] === ERREUR LIVRAISON ===');
    console.error('📊 Error data:', data);
    
    this.deliveryState.isDelivering = false;
    
    const errorMsg = data.message || data.error || 'Erreur inconnue lors de la livraison';
    this.showMessage(errorMsg, 'error', { duration: 5000 });
    
    // ✅ Callback custom
    if (this.onDeliveryFailed && typeof this.onDeliveryFailed === 'function') {
      this.onDeliveryFailed(data, this.deliveryState.currentDelivery);
    }
    
    // ✅ Historique
    if (this.deliveryState.currentDelivery) {
      this.deliveryState.deliveryHistory.push({
        ...this.deliveryState.currentDelivery,
        errorAt: Date.now(),
        result: 'error',
        error: errorMsg,
        serverResponse: data
      });
    }
    
    // ✅ Reset état
    this.deliveryState.currentDelivery = null;
  }

  // === 🔍 UTILITAIRES LIVRAISON ===

  /**
   * Vérifier si une interaction est une livraison
   * @param {Object} data - Données d'interaction
   * @returns {boolean}
   */
  isDeliveryInteraction(data) {
    return !!(
      data.deliveryData ||
      data.contextualData?.deliveryData ||
      data.unifiedInterface?.deliveryData ||
      (data.items && Array.isArray(data.items) && data.questId) ||
      data.type === 'questDelivery'
    );
  }

  /**
   * Obtenir l'état actuel de livraison
   * @returns {Object}
   */
  getDeliveryState() {
    return {
      ...this.deliveryState,
      hasActiveDelivery: !!this.deliveryState.currentDelivery,
      isDelivering: this.deliveryState.isDelivering,
      overlayVisible: this.deliveryOverlay?.isOpen() || false
    };
  }

  /**
   * Forcer la fermeture de la livraison
   */
  closeDelivery() {
    console.log('🚪 [QuestSystem] Fermeture forcée livraison');
    
    if (this.deliveryOverlay) {
      this.deliveryOverlay.hide();
    }
    
    this.deliveryState.currentDelivery = null;
    this.deliveryState.isDelivering = false;
  }

  // === 🎯 MÉTHODES PUBLIQUES POUR DIALOGUEMANAGER (mises à jour) ===
  
  showQuestDetailsForNpc(npcId, availableQuestIds) {
    if (!this.detailsUI) {
      console.error('❌ [QuestSystem] QuestDetailsUI non initialisé');
      return false;
    }
    
    if (!availableQuestIds || availableQuestIds.length === 0) {
      console.warn('⚠️ [QuestSystem] Aucune quête disponible pour NPC', npcId);
      this.showMessage('Aucune quête disponible pour le moment.', 'info');
      return false;
    }
    
    console.log(`📋 [QuestSystem] Affichage quêtes pour NPC ${npcId}:`, availableQuestIds);
    
    if (availableQuestIds.length === 1) {
      this.detailsUI.showSingleQuest(npcId, availableQuestIds[0]);
    } else {
      this.detailsUI.showMultipleQuests(npcId, availableQuestIds);
    }
    
    return true;
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Afficher overlay de livraison pour NPC
   * @param {string} npcId - ID du NPC
   * @param {Object} deliveryData - Données de livraison
   * @returns {boolean}
   */
  showQuestDeliveryForNpc(npcId, deliveryData) {
    console.log(`🎁 [QuestSystem] Affichage livraison pour NPC ${npcId}`);
    
    if (!this.deliveryOverlay) {
      console.error('❌ [QuestSystem] QuestDeliveryOverlay non disponible');
      return false;
    }
    
    // ✅ Assurer le format correct
    const formattedData = {
      npcId: npcId,
      ...deliveryData
    };
    
    return this.handleQuestDeliveryData({ deliveryData: formattedData });
  }
  
  handleQuestActionFromDialogue(actionData) {
    const npcId = actionData.npcId;
    
    if (!npcId) {
      console.error('❌ [QuestSystem] NPC ID manquant dans action quest');
      return false;
    }
    
    console.log(`🎯 [QuestSystem] Action quest reçue pour NPC ${npcId}`);
    
    // ✅ NOUVEAU : Vérifier si c'est une action de livraison
    if (actionData.type === 'questDelivery' || actionData.deliveryData) {
      return this.showQuestDeliveryForNpc(npcId, actionData.deliveryData || actionData);
    }
    
    const questData = this.networkManager.getNpcQuestData(npcId);
    
    if (questData.availableQuestIds.length > 0) {
      return this.showQuestDetailsForNpc(npcId, questData.availableQuestIds);
    } else {
      this.showMessage('Ce PNJ n\'a pas de quêtes disponibles pour le moment.', 'info');
      return false;
    }
  }

  // === 🎬 HANDLERS EXISTANTS (inchangés) ===
  
  handleQuestAcceptResult(data) {
    console.log('🎯 [QuestSystem] === DÉBUT handleQuestAcceptResult ===');
    console.log('📊 Data reçue:', data);
    
    if (data.success) {
      const questName = data.quest?.name || data.questName || data.questId;
      const message = data.message || `Quête "${questName}" acceptée !`;
      
      console.log('✅ [QuestSystem] Acceptation réussie:', questName);
      
      this.showMessage(message, 'success');
      
      if (data.quest) {
        const existingQuest = this.activeQuests.find(q => q.id === data.quest.id);
        if (!existingQuest) {
          this.activeQuests.push(data.quest);
          this.updateUI();
          console.log('📝 [QuestSystem] Quête ajoutée aux actives');
        }
      }
      
      if (this.icon) {
        this.icon.animateNewQuest();
      }
      
      this.triggerCallback('onQuestStarted', data.quest);
      
    } else {
      const errorMsg = data.message || data.error || 'Impossible d\'accepter la quête';
      console.error('❌ [QuestSystem] Acceptation échouée:', errorMsg);
      
      this.showMessage(errorMsg, 'error');
      
      if (errorMsg.includes('niveau') || errorMsg.includes('prérequis')) {
        this.showMessage('Vérifiez vos prérequis dans le journal des quêtes', 'info');
      }
    }
    
    console.log('🎯 [QuestSystem] === FIN handleQuestAcceptResult ===');
  }
  
  handleQuestAcceptFromUI(questId, npcId, questData) {
    console.log(`🎯 [QuestSystem] Acceptation quête depuis UI: ${questId} pour NPC ${npcId}`);
    
    if (!this.networkManager) {
      console.error('❌ [QuestSystem] NetworkManager non disponible');
      this.showMessage('Erreur réseau - impossible d\'accepter la quête', 'error');
      return false;
    }
    
    try {
      this.networkManager.sendMessage('acceptQuest', {
        questId: questId,
        npcId: npcId,
        timestamp: Date.now()
      });
      
      console.log(`✅ [QuestSystem] Demande acceptation envoyée: ${questId}`);
      return true;
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur acceptation quête:', error);
      this.showMessage('Erreur lors de l\'acceptation de la quête', 'error');
      return false;
    }
  }
  
  handleQuestProgressUpdate(data) {
    console.log('📈 [QuestSystem] Progression quête:', data);
    
    if (Array.isArray(data)) {
      data.forEach(result => {
        if (result.objectiveCompleted && this.ui && this.ui.highlightObjectiveAsCompleted) {
          this.ui.highlightObjectiveAsCompleted({
            questId: result.questId,
            objectiveName: result.objectiveName || result.message,
            ...result
          });
        }
        
        if (result.message) {
          this.showMessage(result.message, 'success');
        }
      });
    }
    
    setTimeout(() => {
      this.requestActiveQuests();
    }, 1500);
  }
  
  handleActiveQuests(data) {
    console.log('📋 [QuestSystem] Quêtes actives reçues:', data);
    
    this.activeQuests = this.extractQuestArray(data);
    this.updateUI();
    this.triggerCallback('onQuestUpdate', this.activeQuests);
  }
  
  handleAvailableQuests(data) {
    console.log('📋 [QuestSystem] Quêtes disponibles reçues:', data);
    
    this.availableQuests = this.extractQuestArray(data);
    
    if (this.availableQuests.length > 0) {
      console.log(`📋 [QuestSystem] ${this.availableQuests.length} quêtes disponibles stockées`);
    }
  }
  
  handleQuestStartResult(data) {
    console.log('🎯 [QuestSystem] Résultat démarrage quête:', data);
    
    if (data.success && data.quest) {
      const existingQuest = this.activeQuests.find(q => q.id === data.quest.id);
      if (!existingQuest) {
        this.activeQuests.push(data.quest);
        this.updateUI();
      }
      
      this.triggerCallback('onQuestStarted', data.quest);
      this.showMessage(data.message || `Quête "${data.quest.name}" démarrée !`, 'success');
    } else {
      this.showMessage(data.message || 'Impossible de démarrer cette quête', 'error');
    }
  }
  
  handleIntroQuestCompleted(data) {
    console.log('🎉 [QuestSystem] Quête d\'intro terminée:', data);
    
    this.showMessage(data.message || 'Félicitations !', 'success');
    
    if (data.reward) {
      setTimeout(() => {
        this.showMessage(data.reward, 'info');
      }, 2000);
    }
  }

  // === 🎮 ACTIONS UI (inchangées) ===
  
  handleUIAction(action, data) {
    console.log(`🎮 [QuestSystem] Action UI: ${action}`, data);
    
    switch (action) {
      case 'startQuest':
        this.startQuest(data.questId);
        break;
        
      case 'refreshQuests':
        this.requestActiveQuests();
        break;
        
      case 'getAvailableQuests':
        this.requestAvailableQuests();
        break;
        
      default:
        console.warn(`⚠️ [QuestSystem] Action inconnue: ${action}`);
    }
  }
  
  // === 📡 REQUÊTES SERVEUR (inchangées) ===
  
  requestActiveQuests() {
    if (this.networkManager) {
      console.log('📤 [QuestSystem] Demande quêtes actives');
      this.networkManager.sendMessage('getActiveQuests');
    }
  }
  
  requestAvailableQuests() {
    if (this.networkManager) {
      console.log('📤 [QuestSystem] Demande quêtes disponibles');
      this.networkManager.sendMessage('getAvailableQuests');
    }
  }
  
  startQuest(questId) {
    if (this.networkManager) {
      console.log(`📤 [QuestSystem] Démarrage quête: ${questId}`);
      this.networkManager.sendMessage('startQuest', { questId });
    }
  }

  // === 🎭 DÉTECTION INTERACTION NPC (mise à jour) ===
  
  handleNpcInteraction(data) {
    console.log('🎭 [QuestSystem] handleNpcInteraction appelé:', data);
    
    // ✅ NOUVEAU : Priorité aux livraison
    if (this.isDeliveryInteraction(data)) {
      console.log('🎁 [QuestSystem] Interaction de livraison détectée');
      this.handleQuestDeliveryData(data);
      return { handled: true, reason: 'quest_delivery' };
    }
    
    if (this.isQuestInteraction(data)) {
      console.log('🎯 [QuestSystem] Données quête détectées - disponibles pour DialogueManager');
    }
    
    return { handled: false, reason: 'delegated_to_dialogue_manager' };
  }
  
  isQuestInteraction(data) {
    return !!(
      data.type === 'questGiver' ||
      data.type === 'unifiedInterface' ||
      data.availableQuests ||
      data.questRewards ||
      data.contextualData?.hasQuests ||
      data.capabilities?.includes('quest') ||
      (data.message && data.message.toLowerCase().includes('quête')) ||
      this.isDeliveryInteraction(data)
    );
  }

  // === 🔧 UTILITAIRES (inchangés) ===
  
  extractQuestArray(data) {
    if (Array.isArray(data)) return data.filter(q => q?.id);
    if (data?.quests) return data.quests.filter(q => q?.id);
    if (data?.questList) return data.questList.filter(q => q?.id);
    return [];
  }
  
  updateQuestProgress(questId, progressData) {
    const quest = this.activeQuests.find(q => q.id === questId);
    if (quest && progressData) {
      Object.assign(quest, progressData);
    }
  }
  
  updateUI() {
    console.log('🔄 [QuestSystem] updateUI() appelé');
    
    if (this.ui) {
      this.ui.updateQuestData(this.activeQuests, 'active');
      
      if (typeof this.ui.updateTrackerIntelligent === 'function') {
        this.ui.updateTrackerIntelligent();
      } else {
        console.warn('⚠️ [QuestSystem] updateTrackerIntelligent non disponible');
      }
    }
    
    if (this.icon && typeof this.icon.updateStats === 'function') {
      this.icon.updateStats({
        totalActive: this.activeQuests.length,
        newQuests: this.activeQuests.filter(q => q.isNew).length,
        readyToComplete: this.activeQuests.filter(q => q.status === 'ready').length
      });
    }
    
    console.log('✅ [QuestSystem] updateUI() terminé');
  }
  
  triggerCallback(callbackName, data) {
    const callback = this[callbackName];
    if (typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [QuestSystem] Erreur callback ${callbackName}:`, error);
      }
    }
  }
  
  showMessage(message, type = 'info', options = {}) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000, ...options });
    } else {
      console.log(`📢 [QuestSystem] ${type.toUpperCase()}: ${message}`);
    }
  }

  // === 📊 API PUBLIQUE (mise à jour) ===
  
  getActiveQuests() {
    return [...this.activeQuests];
  }
  
  getAvailableQuests() {
    return [...this.availableQuests];
  }
  
  getCompletedQuests() {
    return [...this.completedQuests];
  }
  
  hasActiveQuests() {
    return this.activeQuests.length > 0;
  }
  
  isReady() {
    return this.ready;
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Vérifier si une livraison est en cours
   */
  hasActiveDelivery() {
    return !!(this.deliveryState.currentDelivery && this.deliveryState.isDelivering);
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtenir historique des livraisons
   */
  getDeliveryHistory() {
    return [...this.deliveryState.deliveryHistory];
  }

  // === 🎛️ CONTRÔLES UI (mise à jour) ===
  
  show() {
    if (this.ui) this.ui.show();
    if (this.icon) this.icon.show();
  }
  
  hide() {
    if (this.ui) this.ui.hide();
    if (this.icon) this.icon.hide();
    if (this.ui) this.ui.hideTracker();
    
    if (this.detailsUI && this.detailsUI.isVisible) {
      this.detailsUI.hide();
    }
    
    // ✅ NOUVEAU : Fermer aussi l'overlay de livraison
    if (this.deliveryOverlay && this.deliveryOverlay.isOpen()) {
      this.deliveryOverlay.hide();
    }
  }
  
  toggle() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  setEnabled(enabled) {
    if (this.ui) this.ui.setEnabled(enabled);
    if (this.icon) this.icon.setEnabled(enabled);
    if (this.detailsUI) this.detailsUI.setEnabled(enabled);
    // ✅ NOUVEAU : Contrôler aussi l'overlay de livraison
    if (this.deliveryOverlay) {
      // Note: QuestDeliveryOverlay n'a pas de setEnabled, on peut l'ajouter si nécessaire
    }
  }

  // === 🔗 INTÉGRATION UIMANAGER (inchangée) ===
  
  connectUIManager(uiManager) {
    console.log('🔗 [QuestSystem] Connexion UIManager...');
    
    if (!uiManager || !uiManager.registerIconPosition) {
      console.error('❌ [QuestSystem] UIManager invalide');
      return false;
    }
    
    if (!this.icon || !this.icon.iconElement) {
      console.error('❌ [QuestSystem] Icône non disponible');
      return false;
    }
    
    try {
      uiManager.registerIconPosition('quest', this.icon.iconElement, {
        anchor: 'bottom-right',
        order: 1,
        spacing: 10,
        group: 'ui-icons'
      });
      
      this.icon.iconElement.setAttribute('data-positioned-by', 'uimanager');
      
      console.log('✅ [QuestSystem] UIManager connecté - icône enregistrée');
      return true;
      
    } catch (error) {
      console.error('❌ [QuestSystem] Erreur connexion UIManager:', error);
      return false;
    }
  }

  // === 🧹 NETTOYAGE (mise à jour) ===
  
  destroy() {
    console.log('🧹 [QuestSystem] Destruction avec QuestDeliveryOverlay...');
    
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    
    if (this.icon) {
      this.icon.destroy();
      this.icon = null;
    }
    
    if (this.detailsUI) {
      this.detailsUI.destroy();
      this.detailsUI = null;
    }
    
    // ✅ NOUVEAU : Détruire QuestDeliveryOverlay
    if (this.deliveryOverlay) {
      this.deliveryOverlay.destroy();
      this.deliveryOverlay = null;
    }
    
    this.tracker = null;
    this.networkManager = null;
    this.gameRoom = null;
    this.ready = false;
    
    this.activeQuests = [];
    this.availableQuests = [];
    this.completedQuests = [];
    
    // ✅ NOUVEAU : Reset état livraison
    this.deliveryState = {
      currentDelivery: null,
      isDelivering: false,
      lastDeliveryTime: 0,
      deliveryHistory: []
    };
    
    console.log('✅ [QuestSystem] Détruit avec système de livraison');
  }
}

// === FACTORY FUNCTION MISE À JOUR ===

export async function createQuestSystem(gameRoom, networkManager) {
  try {
    console.log('🏭 [QuestFactory] Création QuestSystem avec QuestDeliveryOverlay...');
    
    const questSystem = new QuestSystem(gameRoom, networkManager);
    await questSystem.init();
    
    // Exposer globalement
    window.questSystem = questSystem;
    window.questSystemGlobal = questSystem;
    
    // Fonctions de compatibilité
    window.toggleQuest = () => questSystem.toggle();
    window.openQuest = () => questSystem.show();
    window.closeQuest = () => questSystem.hide();
    
    // Fonctions de gestion livraison
    window.showQuestDelivery = (npcId, deliveryData) => questSystem.showQuestDeliveryForNpc(npcId, deliveryData);
    window.closeQuestDelivery = () => questSystem.closeDelivery();
    window.getDeliveryState = () => questSystem.getDeliveryState();
    
    // Fonctions de test existantes
    window.testQuestDetailsUI = (npcId = 2, questIds = ['test_quest_1']) => {
      console.log('🧪 Test QuestDetailsUI...');
      return questSystem.showQuestDetailsForNpc(npcId, questIds);
    };
    
    window.testQuestAction = (npcId = 2) => {
      console.log('🧪 Test action quest DialogueManager...');
      return questSystem.handleQuestActionFromDialogue({ npcId });
    };

    // ✅ NOUVELLES FONCTIONS DE TEST : Livraison
    window.testQuestDeliverySystem = (npcId = 9001) => {
      console.log('🧪 Test système de livraison complet...');
      
      const testDeliveryData = {
        questId: 'test_delivery_quest',
        npcId: npcId,
        items: [
          {
            itemId: 'gardening_gloves',
            itemName: 'Gants de Jardinage',
            required: 1,
            playerHas: 1
          },
          {
            itemId: 'berry_oran', 
            itemName: 'Baie Oran',
            required: 5,
            playerHas: 3
          }
        ],
        canDeliverAll: false,
        message: 'Apportez-moi ces objets pour terminer la quête'
      };
      
      return questSystem.showQuestDeliveryForNpc(npcId, testDeliveryData);
    };

    window.testQuestDeliverySuccess = () => {
      console.log('🧪 Test résultat livraison succès...');
      questSystem.handleQuestDeliveryResult({
        success: true,
        message: 'Tous les objets ont été livrés avec succès !',
        questId: 'test_delivery_quest',
        experience: 250,
        gold: 100
      });
    };

    window.testQuestDeliveryFailure = () => {
      console.log('🧪 Test résultat livraison échec...');
      questSystem.handleQuestDeliveryResult({
        success: false,
        message: 'Vous n\'avez pas tous les objets requis',
        error: 'INSUFFICIENT_ITEMS'
      });
    };

    window.debugQuestDelivery = () => {
      console.log('🔍 Debug état livraison:', questSystem.getDeliveryState());
      console.log('🔍 Historique livraisons:', questSystem.getDeliveryHistory());
      console.log('🔍 Overlay disponible:', !!questSystem.deliveryOverlay);
    };
    
    console.log('✅ [QuestFactory] QuestSystem créé avec livraison complète');
    console.log('🎯 Messages unifiés: acceptQuest → questAcceptResult');
    console.log('🎁 Système livraison: questDelivery ↔ questDeliveryResult');
    console.log('🧪 Tests disponibles:');
    console.log('   - window.testQuestDeliverySystem() - Test overlay livraison');
    console.log('   - window.testQuestDeliverySuccess() - Test succès livraison');  
    console.log('   - window.testQuestDeliveryFailure() - Test échec livraison');
    console.log('   - window.debugQuestDelivery() - Debug état livraison');
    console.log('   - window.showQuestDelivery(npcId, data) - Afficher livraison');
    console.log('   - window.closeQuestDelivery() - Fermer livraison');
    
    return questSystem;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

export default QuestSystem;
