// Quest/QuestSystem.js - VERSION COMPLÈTE AVEC QUESTDELIVERYOVERLAY
// 📦 Système complet avec overlay de livraison intégré
// ✅ Connexions réseau pour livraison de quêtes + UI unifiée
// 🛡️ CORRECTION: Protection contre double envoi questDelivery

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
      deliveryHistory: [],
      // 🛡️ NOUVEAU : Protection double envoi au niveau système
      preventDoubleDelivery: true,
      deliveryCooldown: 3000, // 3 secondes entre livraisons système
      lastDeliveryNonce: null
    };
    
    console.log('📖 [QuestSystem] Instance créée avec QuestDeliveryOverlay et protection double envoi');
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
      
      // 🛡️ MODIFICATION CRITIQUE : Supprimer callback qui cause double envoi
      // ❌ ANCIEN CODE QUI CAUSAIT LE DOUBLE ENVOI :
      // this.deliveryOverlay.onDeliveryConfirm = (deliveryData, npcId) => {
      //   this.handleDeliveryConfirmFromOverlay(deliveryData, npcId);
      // };
      
      // ✅ NOUVEAU : Pas de callback système, seulement callback UI
      this.deliveryOverlay.onClose = () => {
        console.log('🎁 [QuestSystem] QuestDeliveryOverlay fermé');
        this.deliveryState.currentDelivery = null;
        this.deliveryState.isDelivering = false;
      };
      
      console.log('🎁 [QuestSystem] QuestDeliveryOverlay créé SANS callback double envoi');
      
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
    // ✅ NOUVEAU : Afficher le dialogue EN PREMIER si disponible
    if (data.lines && data.lines.length > 0) {
      console.log('💬 [QuestSystem] Affichage dialogue avec livraison');
      this.showDialogueWithDelivery(data);
    }
    
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
    
    // ✅ MODIFIÉ : Afficher l'overlay avec un léger délai si dialogue affiché
    const showDeliveryOverlay = () => {
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
    };
    
    // ✅ Si dialogue affiché, attendre un peu avant d'afficher l'overlay
    if (data.lines && data.lines.length > 0) {
      // Délai pour que le joueur puisse lire le dialogue
      setTimeout(() => {
        showDeliveryOverlay();
      }, 500); // 500ms de délai
    } else {
      // Sinon afficher immédiatement
      showDeliveryOverlay();
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ [QuestSystem] Erreur traitement données livraison:', error);
    this.showMessage(`Erreur livraison: ${error.message}`, 'error');
    return false;
  }
}

// ✅ NOUVELLE MÉTHODE : Afficher dialogue avec indicateur de livraison
showDialogueWithDelivery(data) {
  console.log('💬 [QuestSystem] === AFFICHAGE DIALOGUE AVEC LIVRAISON ===');
  
  // Préparer les données de dialogue
  const dialogueData = {
    portrait: data.portrait || '/assets/portrait/defaultPortrait.png',
    name: data.npcName || 'NPC',
    lines: data.lines || ["J'attends que vous me livriez quelque chose..."],
    
    // ✅ NOUVEAU : Ajouter un indicateur visuel de livraison
    showDeliveryIndicator: true,
    deliveryIcon: '📦',
    
    // ✅ Options d'affichage
    options: {
      autoClose: false, // Ne pas fermer automatiquement
      showSkipButton: true,
      showDeliveryHint: true,
      deliveryHintText: '📦 Livraison disponible'
    },
    
    // ✅ Callback quand le dialogue est fermé
    onClose: () => {
      console.log('💬 [QuestSystem] Dialogue fermé, overlay livraison reste visible');
    }
  };
  
  // Utiliser le système de dialogue disponible
  if (window.dialogueManager && typeof window.dialogueManager.show === 'function') {
    console.log('🆕 [QuestSystem] Utilisation DialogueManager');
    window.dialogueManager.show(dialogueData);
  } else if (typeof window.showNpcDialogue === 'function') {
    console.log('🔄 [QuestSystem] Utilisation ancien système dialogue');
    window.showNpcDialogue(dialogueData);
  } else if (typeof window.showDialogue === 'function') {
    console.log('🔄 [QuestSystem] Utilisation showDialogue');
    window.showDialogue(dialogueData);
  } else {
    console.warn('⚠️ [QuestSystem] Aucun système dialogue disponible');
    // Afficher au moins le message
    this.showMessage(data.lines[0] || "Livraison disponible", 'info');
  }
}

// ✅ OPTIONNEL : Méthode pour afficher les deux simultanément
showDialogueAndDeliverySimultaneous(data) {
  console.log('🎭 [QuestSystem] === AFFICHAGE SIMULTANÉ DIALOGUE + LIVRAISON ===');
  
  // 1. Afficher le dialogue
  if (data.lines && data.lines.length > 0) {
    const dialogueData = {
      portrait: data.portrait || '/assets/portrait/defaultPortrait.png',
      name: data.npcName || 'NPC',
      lines: data.lines,
      
      // ✅ Positionner le dialogue pour ne pas cacher l'overlay
      position: 'top', // ou 'left' selon votre UI
      compact: true, // Mode compact pour laisser de la place
      
      options: {
        autoClose: false,
        showSkipButton: false, // Pas de skip, l'overlay est plus important
        fadeBackground: false // Ne pas assombrir le fond
      }
    };
    
    if (window.dialogueManager) {
      window.dialogueManager.show(dialogueData);
    }
  }
  
  // 2. Afficher l'overlay de livraison EN MÊME TEMPS
  const deliveryData = this.extractDeliveryData(data);
  if (deliveryData && deliveryData.items && deliveryData.items.length > 0) {
    // Positionner l'overlay pour ne pas chevaucher avec le dialogue
    deliveryData.position = 'center'; // ou 'bottom' selon votre UI
    deliveryData.offsetY = 100; // Décaler si nécessaire
    
    this.deliveryOverlay.show(deliveryData);
  }
  
  return true;
}

// ✅ MÉTHODE ALTERNATIVE : Mode "conversation + livraison"
showConversationWithDelivery(data) {
  console.log('💬📦 [QuestSystem] === MODE CONVERSATION AVEC LIVRAISON ===');
  
  // Créer un dialogue enrichi qui inclut l'info de livraison
  const enrichedDialogue = {
    portrait: data.portrait || '/assets/portrait/defaultPortrait.png',
    name: data.npcName || 'NPC',
    lines: [
      ...(data.lines || []),
      "", // Ligne vide pour séparer
      "📦 **Objets à livrer:**"
    ],
    
    // ✅ Ajouter la liste des items dans le dialogue
    additionalContent: this.formatDeliveryItemsForDialogue(data),
    
    // ✅ Actions dans le dialogue
    actions: [
      {
        label: "📦 Voir détails livraison",
        action: () => {
          // Fermer dialogue et ouvrir overlay
          if (window.dialogueManager) window.dialogueManager.hide();
          const deliveryData = this.extractDeliveryData(data);
          this.deliveryOverlay.show(deliveryData);
        }
      },
      {
        label: "❌ Plus tard",
        action: () => {
          if (window.dialogueManager) window.dialogueManager.hide();
        }
      }
    ]
  };
  
  if (window.dialogueManager) {
    window.dialogueManager.show(enrichedDialogue);
  }
}

// ✅ Utilitaire : Formater les items pour affichage dans dialogue
formatDeliveryItemsForDialogue(data) {
  const deliveryData = this.extractDeliveryData(data);
  if (!deliveryData || !deliveryData.items) return "";
  
  let content = "<div class='delivery-items-list'>";
  
  deliveryData.items.forEach(item => {
    const status = item.playerHas >= item.required ? "✅" : "❌";
    content += `<div class='delivery-item'>`;
    content += `${status} ${item.itemName}: ${item.playerHas}/${item.required}`;
    content += `</div>`;
  });
  
  content += "</div>";
  
  if (deliveryData.canDeliverAll) {
    content += "<div class='delivery-ready'>✨ Prêt à livrer !</div>";
  }
  
  return content;
}

  /**
   * Extraire les données de livraison du message serveur
   * @param {Object} data - Données brutes du serveur
   * @returns {Object} Données formatées pour l'overlay
   */
extractDeliveryData(data) {
  console.log('🔍 [QuestSystem] Extraction données livraison, data reçue:', data);
  
  // ✅ Format 1 : Données directes de livraison (CORRIGÉ)
  if (data.deliveryData) {
    console.log('📦 [QuestSystem] Format 1 détecté: deliveryData');
    
    // ✅ CORRECTION : Mapper "deliveries" vers "items" pour l'overlay
    const deliveries = data.deliveryData.deliveries || [];
    const items = deliveries.map(delivery => ({
      itemId: delivery.itemId,
      itemName: delivery.itemName || delivery.itemId,
      required: delivery.requiredAmount || 1,
      playerHas: delivery.playerHasAmount || 0,
      canDeliver: delivery.canDeliver || false,
      // Conserver les données originales
      questId: delivery.questId,
      questName: delivery.questName,
      stepIndex: delivery.stepIndex,
      stepName: delivery.stepName,
      objectiveId: delivery.objectiveId,
      objectiveDescription: delivery.objectiveDescription
    }));
    
    console.log('✅ [QuestSystem] Items extraits:', items);
    
    return {
      questId: deliveries[0]?.questId || data.questId,
      questName: deliveries[0]?.questName || 'Livraison',
      npcId: data.deliveryData.npcId || data.npcId,
      npcName: data.deliveryData.npcName || data.npcName || 'NPC',
      items: items,
      canDeliverAll: data.deliveryData.allItemsAvailable || false,
      message: data.message || 'Objets requis pour la quête',
      // Conserver les données originales pour le traitement
      originalDeliveries: deliveries,
      totalDeliveries: data.deliveryData.totalDeliveries || deliveries.length,
      readyDeliveries: data.deliveryData.readyDeliveries || 0
    };
  }
  
  // ✅ Format 2 : Données dans contextualData
  if (data.contextualData && data.contextualData.deliveryData) {
    console.log('📦 [QuestSystem] Format 2 détecté: contextualData.deliveryData');
    const delivery = data.contextualData.deliveryData;
    
    // Même traitement que format 1
    const deliveries = delivery.deliveries || [];
    const items = deliveries.map(d => ({
      itemId: d.itemId,
      itemName: d.itemName || d.itemId,
      required: d.requiredAmount || 1,
      playerHas: d.playerHasAmount || 0,
      canDeliver: d.canDeliver || false,
      questId: d.questId,
      questName: d.questName,
      objectiveId: d.objectiveId
    }));
    
    return {
      questId: deliveries[0]?.questId || data.questId,
      questName: deliveries[0]?.questName || 'Livraison',
      npcId: delivery.npcId || data.npcId,
      npcName: delivery.npcName || data.npcName || 'NPC',
      items: items,
      canDeliverAll: delivery.allItemsAvailable || false,
      message: data.message || 'Objets requis pour la quête',
      originalDeliveries: deliveries,
      totalDeliveries: delivery.totalDeliveries || deliveries.length,
      readyDeliveries: delivery.readyDeliveries || 0
    };
  }
  
  // ✅ Format 3 : Données dans unifiedInterface
  if (data.unifiedInterface && data.unifiedInterface.deliveryData) {
    console.log('📦 [QuestSystem] Format 3 détecté: unifiedInterface.deliveryData');
    const delivery = data.unifiedInterface.deliveryData;
    
    const deliveries = delivery.deliveries || [];
    const items = deliveries.map(d => ({
      itemId: d.itemId,
      itemName: d.itemName || d.itemId,
      required: d.requiredAmount || 1,
      playerHas: d.playerHasAmount || 0,
      canDeliver: d.canDeliver || false,
      questId: d.questId,
      questName: d.questName,
      objectiveId: d.objectiveId
    }));
    
    return {
      questId: deliveries[0]?.questId || data.questId,
      questName: deliveries[0]?.questName || 'Livraison',
      npcId: delivery.npcId || data.npcId,
      npcName: delivery.npcName || data.npcName || 'NPC',
      items: items,
      canDeliverAll: delivery.allItemsAvailable || false,
      message: data.message || 'Objets requis pour la quête',
      originalDeliveries: deliveries,
      totalDeliveries: delivery.totalDeliveries || deliveries.length,
      readyDeliveries: delivery.readyDeliveries || 0
    };
  }
  
  // ✅ Format 4 : Données à la racine (format simple avec items)
  if (data.items && Array.isArray(data.items)) {
    console.log('📦 [QuestSystem] Format 4 détecté: items à la racine');
    return {
      questId: data.questId,
      questName: data.questName || 'Livraison',
      npcId: data.npcId,
      npcName: data.npcName || 'NPC',
      items: data.items,
      canDeliverAll: data.canDeliverAll || false,
      message: data.message || 'Objets requis pour la quête'
    };
  }
  
  // ✅ Format 5 : Données à la racine (format avec deliveries)
  if (data.deliveries && Array.isArray(data.deliveries)) {
    console.log('📦 [QuestSystem] Format 5 détecté: deliveries à la racine');
    
    const items = data.deliveries.map(d => ({
      itemId: d.itemId,
      itemName: d.itemName || d.itemId,
      required: d.requiredAmount || 1,
      playerHas: d.playerHasAmount || 0,
      canDeliver: d.canDeliver || false,
      questId: d.questId,
      questName: d.questName,
      objectiveId: d.objectiveId
    }));
    
    return {
      questId: data.deliveries[0]?.questId || data.questId,
      questName: data.deliveries[0]?.questName || 'Livraison',
      npcId: data.npcId,
      npcName: data.npcName || 'NPC',
      items: items,
      canDeliverAll: data.allItemsAvailable || false,
      message: data.message || 'Objets requis pour la quête',
      originalDeliveries: data.deliveries,
      totalDeliveries: data.totalDeliveries || data.deliveries.length,
      readyDeliveries: data.readyDeliveries || 0
    };
  }
  
  console.warn('⚠️ [QuestSystem] Format de données livraison non reconnu:', data);
  return null;
}

  // 🛡️ MÉTHODE SUPPRIMÉE : handleDeliveryConfirmFromOverlay() 
  // Cette méthode était la source du double envoi !
  // Elle envoyait le message questDelivery au serveur, mais l'overlay le fait déjà
  
  /**
   * Handler pour résultat de livraison du serveur
   * @param {Object} data - Résultat de livraison
   */
  handleQuestDeliveryResult(data) {
    console.log('🎉 [QuestSystem] === RÉSULTAT LIVRAISON ===');
    console.log('📊 Data:', data);
    
    // 🛡️ Transmettre le résultat à l'overlay pour gestion
    if (this.deliveryOverlay && typeof this.deliveryOverlay.handleDeliveryResult === 'function') {
      this.deliveryOverlay.handleDeliveryResult(data);
    } else {
      // 🛡️ Fallback si overlay pas disponible
      this.handleDeliveryResultFallback(data);
    }
  }
  
  /**
   * 🛡️ NOUVELLE MÉTHODE : Fallback si overlay indisponible
   */
  handleDeliveryResultFallback(data) {
    this.deliveryState.isDelivering = false;
    
    if (data.success) {
      // ✅ SUCCÈS
      const message = data.message || 'Objets livrés avec succès !';
      console.log('✅ [QuestSystem] Livraison réussie');
      
      // ✅ Notification de succès
      this.showMessage(message, 'success', { duration: 4000 });
      
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
    
    // 🛡️ Transmettre à l'overlay si disponible
    if (this.deliveryOverlay && typeof this.deliveryOverlay.handleDeliveryResult === 'function') {
      this.deliveryOverlay.handleDeliveryResult({ success: false, ...data });
    } else {
      // 🛡️ Fallback
      this.handleDeliveryResultFallback({ success: false, ...data });
    }
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
      deliveryHistory: [],
      preventDoubleDelivery: true,
      deliveryCooldown: 3000,
      lastDeliveryNonce: null
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
    
    console.log('✅ [QuestFactory] QuestSystem créé avec livraison SANS double envoi');
    console.log('🎯 Messages unifiés: acceptQuest → questAcceptResult');
    console.log('🎁 Système livraison: questDelivery ↔ questDeliveryResult (SANS DOUBLE ENVOI)');
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
