// Quest/QuestManager.js - FIXES ANTI-DUPLICATION + PROGRESSION OBJECTIFS

export class QuestManager {
  constructor(gameRoom) {
    // État simple
    this.ready = false;
    this.initialized = false;
    this.handlersRegistered = false;
    
    // ✅ FIX 1: Compteur debug + protection anti-spam
    this.debugCallCount = 0;
    this.debugCallLog = [];
    this.lastInteractionTime = 0;
    this.interactionCooldown = 500; // 500ms cooldown
    
    // Données
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    
    // ✅ FIX 2: Déduplication hash pour TOUS les handlers
    this.handlerHashes = {
      availableQuestsList: { hash: null, time: 0 },
      activeQuestsList: { hash: null, time: 0 },
      questStartResult: { hash: null, time: 0 },
      questStatuses: { hash: null, time: 0 },
      questProgressUpdate: { hash: null, time: 0 }
    };
    this.hashCooldown = 1000; // 1 seconde
    
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
    
    // ✅ FIX 3: Références des handlers pour nettoyage agressif
    this.handlerRefs = new Map();
    this.handlerCleanupAttempts = 0;
    this.maxCleanupAttempts = 3;
    
    console.log('📖 [QuestManager] Instance créée - Version ANTI-DUPLICATION + PROGRESSION');
    
    if (gameRoom) {
      this.setGameRoom(gameRoom);
    }
  }
  
  // === 🚀 INITIALISATION SIMPLIFIÉE ===
  
  async init(gameRoom = null, networkManager = null) {
    try {
      console.log('🚀 [QuestManager] Initialisation avec fixes anti-duplication...');
      
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
      
      // ✅ FIX 4: Nettoyage AGRESSIF avant enregistrement
      if (this.handlersRegistered) {
        console.log('🧹 [QuestManager] Handlers déjà enregistrés, nettoyage agressif...');
        this.unregisterHandlers();
      }
      
      // 3. Enregistrement handlers avec protection
      this.registerHandlers();
      this.handlersRegistered = true;
      
      // 4. PRÊT IMMÉDIATEMENT
      this.ready = true;
      this.initialized = true;
      
      // ✅ FIX: Charger les quêtes actives au démarrage
      console.log('🔄 [QuestManager] Chargement initial des quêtes...');
      setTimeout(() => {
        if (this.isReady()) {
          this.requestActiveQuests();
        }
      }, 1500); // Délai pour s'assurer que tout est connecté
      
      console.log('✅ [QuestManager] Prêt avec protection anti-duplication !');
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
  
  // ✅ FIX: Méthode générique de déduplication
  isDuplicate(handlerName, data) {
    const dataHash = JSON.stringify(data);
    const now = Date.now();
    const handlerCache = this.handlerHashes[handlerName];
    
    if (!handlerCache) {
      console.warn(`⚠️ [QuestManager] Handler ${handlerName} non configuré pour déduplication`);
      return false;
    }
    
    // Vérifier hash ET timestamp
    if (handlerCache.hash === dataHash && 
        handlerCache.time && 
        (now - handlerCache.time) < this.hashCooldown) {
      console.log(`🚫 [QuestManager] ${handlerName} DUPLIQUÉ ignoré (hash+time)`);
      return true;
    }
    
    // Mettre à jour hash et timestamp
    handlerCache.hash = dataHash;
    handlerCache.time = now;
    
    return false;
  }
  
  // === 📡 ENREGISTREMENT HANDLERS AVEC NETTOYAGE AGRESSIF ===
  
  registerHandlers() {
    if (!this.gameRoom) {
      console.error('❌ [QuestManager] Pas de GameRoom');
      return false;
    }
    
    console.log('📡 [QuestManager] Enregistrement handlers avec protection...');
    
    // ✅ FIX 5: Nettoyer AVANT d'enregistrer
    this.unregisterHandlers();
    
    try {
      // Créer et stocker les handlers
      const handlers = {
        "activeQuestsList": (data) => {
          // ✅ DÉDUPLICATION GÉNÉRALISÉE
          if (this.isDuplicate('activeQuestsList', data)) return;
          
          console.log('📥 [QuestManager] Quêtes actives (UNIQUE):', data);
          this.activeQuests = this.extractQuests(data);
          this.updateStats();
          this.triggerCallbacks();
        },

        "availableQuestsList": (data) => {
          // ✅ DÉDUPLICATION GÉNÉRALISÉE
          if (this.isDuplicate('availableQuestsList', data)) return;
          
          console.log('📥 [QuestManager] Quêtes disponibles (UNIQUE):', data);
          this.availableQuests = this.extractQuests(data);
          
          if (this.pendingQuestRequest && this.availableQuests.length > 0) {
            this.showQuestSelection();
          }
          this.pendingQuestRequest = false;
        },

        "questStartResult": (data) => {
          // ✅ DÉDUPLICATION GÉNÉRALISÉE
          if (this.isDuplicate('questStartResult', data)) return;
          
          console.log('📥 [QuestManager] Résultat démarrage (UNIQUE):', data);
          this.handleQuestStartResult(data);
        },

        "questProgressUpdate": (data) => {
          // ✅ DÉDUPLICATION GÉNÉRALISÉE
          if (this.isDuplicate('questProgressUpdate', data)) return;
          
          console.log('📥 [QuestManager] Progression (UNIQUE):', data);
          this.handleQuestProgress(data);
        },

        "questStatuses": (data) => {
          // ✅ DÉDUPLICATION GÉNÉRALISÉE
          if (this.isDuplicate('questStatuses', data)) return;
          
          console.log('📥 [QuestManager] Statuts (UNIQUE):', data);
          this.handleQuestStatuses(data);
        }
      };
      
      // ✅ FIX 7: Enregistrer avec vérification
      Object.entries(handlers).forEach(([eventName, handler]) => {
        // Vérifier si handler existe déjà
        if (this.gameRoom._messageHandlers?.has(eventName)) {
          const existingHandlers = this.gameRoom._messageHandlers.get(eventName);
          console.log(`🔍 [QuestManager] ${eventName}: ${existingHandlers.length} handlers existants`);
        }
        
        this.gameRoom.onMessage(eventName, handler);
        this.handlerRefs.set(eventName, handler);
        
        // Vérification post-enregistrement
        if (this.gameRoom._messageHandlers?.has(eventName)) {
          const newHandlerCount = this.gameRoom._messageHandlers.get(eventName).length;
          console.log(`✅ [QuestManager] ${eventName}: ${newHandlerCount} handlers après enregistrement`);
        }
      });
      
      console.log('✅ [QuestManager] Handlers enregistrés avec protection');
      return true;
      
    } catch (error) {
      console.error('❌ [QuestManager] Erreur handlers:', error);
      return false;
    }
  }
  
  // ✅ FIX 8: Nettoyage AGRESSIF amélioré
  unregisterHandlers() {
    if (!this.gameRoom) {
      return;
    }
    
    this.handlerCleanupAttempts++;
    console.log(`🧹 [QuestManager] Nettoyage AGRESSIF handlers (tentative ${this.handlerCleanupAttempts})...`);
    
    const eventNames = ['activeQuestsList', 'availableQuestsList', 'questStartResult', 'questProgressUpdate', 'questStatuses'];
    
    if (this.gameRoom._messageHandlers) {
      eventNames.forEach(eventName => {
        const handlers = this.gameRoom._messageHandlers.get(eventName);
        if (handlers && Array.isArray(handlers)) {
          const initialCount = handlers.length;
          
          // ✅ NETTOYAGE SUPER AGRESSIF: Vider complètement + supprimer entrée
          handlers.length = 0;
          
          // Pour être sûr, supprimer l'entrée complètement
          if (initialCount > 0) {
            this.gameRoom._messageHandlers.delete(eventName);
            console.log(`🧹 [QuestManager] ${eventName}: ${initialCount} handlers supprimés + entrée effacée`);
          }
        }
      });
    }
    
    // Nettoyer nos références
    this.handlerRefs.clear();
    
    // Reset des hashes pour éviter les conflits
    Object.keys(this.handlerHashes).forEach(handler => {
      this.handlerHashes[handler] = { hash: null, time: 0 };
    });
    
    console.log('✅ [QuestManager] Nettoyage AGRESSIF terminé');
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
    
    // ✅ FIX 9: Protection anti-spam renforcée
    const now = Date.now();
    if (this.lastInteractionTime && (now - this.lastInteractionTime) < this.interactionCooldown) {
      console.log(`🚫 [QuestManager] Cooldown actif (${now - this.lastInteractionTime}ms < ${this.interactionCooldown}ms)`);
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
    // ✅ FIX 10: Protection contre double requête
    if (this.pendingQuestRequest) {
      console.log('🚫 [QuestManager] Requête déjà en cours, ignorer');
      return false;
    }
    
    this.pendingQuestRequest = true;
    return this.sendRequest("getAvailableQuests");
  }
  
  startQuest(questId) {
    console.log(`🎯 [QuestManager] Démarrage quête: ${questId}`);
    return this.sendRequest("startQuest", { questId });
  }
  
  // === 🗣️ INTERACTION NPC AVEC PROTECTION ANTI-SPAM RENFORCÉE ===
  
  handleNpcInteraction(data, debugSource = 'unknown') {
    // ✅ FIX 11: Protection anti-spam AVANT incrémentation
    const now = Date.now();
    if (this.lastInteractionTime && (now - this.lastInteractionTime) < this.interactionCooldown) {
      console.log(`🚫 [QuestManager] Interaction bloquée (cooldown ${now - this.lastInteractionTime}ms)`);
      return 'BLOCKED_COOLDOWN';
    }
    
    // Incrémenter le compteur seulement si on passe le cooldown
    this.debugCallCount++;
    
    // Log avec source et timestamp
    console.log(`🔔 [QuestManager] APPEL #${this.debugCallCount} depuis: ${debugSource} (${now})`);
    
    // ✅ FIX 12: Logique simplifiée - traiter seulement le premier appel valide
    if (this.debugCallCount === 1 || (now - this.lastInteractionTime) >= this.interactionCooldown) {
      console.log('🗣️ [QuestManager] Interaction NPC VALIDE:', data);
      
      if (!this.canProcessInteraction()) {
        this.resetDebugCallCount(); // Reset pour la prochaine fois
        return 'BLOCKED';
      }
      
      // Mettre à jour le timestamp ICI pour éviter les doublons
      this.lastInteractionTime = now;
      
      if (!data || data.type !== 'questGiver') {
        this.resetDebugCallCount();
        return 'NO_QUEST';
      }
      
      if (data.availableQuests?.length > 0) {
        this.showQuestDialog('Choisir une quête', data.availableQuests);
        this.resetDebugCallCount();
        return 'QUESTS_SHOWN';
      }
      
      if (!this.pendingQuestRequest) {
        this.requestAvailableQuests();
        this.resetDebugCallCount();
        return 'REQUESTING_QUESTS';
      }
      
      this.resetDebugCallCount();
      return 'ALREADY_REQUESTING';
    } else {
      // Appels supplémentaires - juste logger et bloquer
      console.log(`🚫 [QuestManager] Appel supplémentaire #${this.debugCallCount} ignoré (anti-spam)`);
      return 'BLOCKED_DUPLICATE';
    }
  }
  
  // ✅ FIX 13: Méthode pour reset debug
  resetDebugCallCount() {
    console.log(`🔄 [QuestManager] Reset debug count (était ${this.debugCallCount})`);
    this.debugCallCount = 0;
  }
  
  // === 🎮 GESTION DES ACTIONS UI ===
  
  handleAction(action, data) {
    console.log(`🎮 [QuestManager] Action reçue: ${action}`, data);
    
    try {
      switch (action) {
        case 'refreshQuests':
        case 'refresh':
          this.requestActiveQuests();
          break;
          
        case 'startQuest':
          if (data?.questId) {
            this.startQuest(data.questId);
          }
          break;
          
        case 'getAvailableQuests':
          this.requestAvailableQuests();
          break;
          
        case 'getActiveQuests':
          this.requestActiveQuests();
          break;
          
        default:
          console.warn(`⚠️ [QuestManager] Action inconnue: ${action}`);
      }
    } catch (error) {
      console.error(`❌ [QuestManager] Erreur action ${action}:`, error);
    }
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
      
      // ✅ FIX: Protection contre boucle infinie
      if (!this.isRequestingActiveQuests) {
        this.isRequestingActiveQuests = true;
        setTimeout(() => {
          this.requestActiveQuests();
          this.isRequestingActiveQuests = false;
        }, 500);
      }
    } else {
      this.showNotification(data?.message || "Impossible de démarrer cette quête", 'error');
    }
  }
  
  // ✅ NOUVELLE VERSION: Progression avec étapes visuelles
  handleQuestProgress(data) {
    if (!Array.isArray(data)) return;
    
    console.log('🎯 [QuestManager] Traitement progression quête:', data);
    
    data.forEach(result => {
      if (result.questCompleted) {
        // Quête terminée complètement
        this.triggerCallback('onQuestCompleted', result);
        this.showNotification(`Quête terminée : ${result.questName} !`, 'success');
        this.scheduleDataRefresh(2000);
        
      } else if (result.objectiveCompleted) {
        // ✅ NOUVEAU: Objectif terminé - progression en 3 étapes
        this.handleObjectiveCompletion(result);
        
      } else {
        // Progression normale
        this.triggerCallback('onQuestProgress', result);
      }
    });
  }
  
  // ✅ NOUVELLE MÉTHODE: Gestion completion objectif en 3 étapes SIMPLES
  handleObjectiveCompletion(result) {
    console.log('🎯 [QuestManager] Objectif terminé:', result.objectiveName);
    
    // ÉTAPE 1: Objectif passe en VERT (immédiat)
    this.makeObjectiveGreen(result);
    
    // ÉTAPE 2: Notification après 500ms
    setTimeout(() => {
      this.showNotification(`✅ Objectif terminé : ${result.objectiveName}`, 'success');
    }, 500);
    
    // ÉTAPE 3: Refresh données après 2s pour afficher objectif suivant
    setTimeout(() => {
      this.refreshQuestDataForNextObjective();
    }, 2000);
  }
  
  // ✅ NOUVELLE MÉTHODE: Passer objectif en VERT
  makeObjectiveGreen(result) {
    console.log('🟢 [QuestManager] Objectif → VERT');
    
    // Appel direct à QuestUI si connectée
    if (this.questUI && this.questUI.highlightObjectiveAsCompleted) {
      this.questUI.highlightObjectiveAsCompleted(result);
    } else {
      // Fallback: chercher directement dans le DOM
      this.highlightObjectiveInTracker(result);
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Fallback DOM direct
  highlightObjectiveInTracker(result) {
    try {
      console.log('🔍 [QuestManager] Recherche objectif dans tracker:', result.objectiveName);
      
      // Chercher dans le tracker
      const tracker = document.querySelector('#quest-tracker');
      if (!tracker) {
        console.warn('⚠️ [QuestManager] Tracker non trouvé');
        return;
      }
      
      // Chercher tous les objectifs
      const objectives = tracker.querySelectorAll('.quest-objective');
      
      for (const objective of objectives) {
        if (objective.textContent && objective.textContent.includes(result.objectiveName)) {
          console.log('✅ [QuestManager] Objectif trouvé, application style VERT');
          
          // Appliquer style VERT immédiatement
          objective.style.transition = 'all 0.3s ease';
          objective.style.backgroundColor = '#22c55e'; // Vert
          objective.style.color = '#ffffff';
          objective.style.fontWeight = 'bold';
          objective.style.padding = '6px 8px';
          objective.style.borderRadius = '4px';
          objective.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.4)';
          
          break;
        }
      }
    } catch (error) {
      console.error('❌ [QuestManager] Erreur highlight fallback:', error);
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Refresh pour objectif suivant
  refreshQuestDataForNextObjective() {
    console.log('🔄 [QuestManager] Refresh pour objectif suivant...');
    
    if (!this.isRequestingActiveQuests) {
      this.isRequestingActiveQuests = true;
      
      // Petit délai pour laisser le serveur traiter
      setTimeout(() => {
        this.requestActiveQuests();
        this.isRequestingActiveQuests = false;
        
        // Force mise à jour UI après nouvelles données
        setTimeout(() => {
          if (this.questUI && this.questUI.updateTracker) {
            console.log('🎯 [QuestManager] Force mise à jour tracker après refresh');
            this.questUI.updateTracker();
          }
        }, 300);
      }, 100);
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Schedule refresh avec délai
  scheduleDataRefresh(delay = 1000) {
    setTimeout(() => {
      this.refreshQuestDataForNextObjective();
    }, delay);
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
      this.handleNpcInteraction(data, 'NetworkManager');
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
  
  // === 🐛 DEBUG AMÉLIORÉ ===
  
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
      handlerRefsCount: this.handlerRefs.size,
      
      // ✅ Info debug anti-duplication
      debugCallCount: this.debugCallCount,
      debugCallLog: this.debugCallLog.slice(-5),
      handlerHashes: Object.fromEntries(
        Object.entries(this.handlerHashes).map(([handler, cache]) => [
          handler, 
          { 
            hasHash: !!cache.hash, 
            lastTime: cache.time,
            age: cache.time ? Date.now() - cache.time : 0
          }
        ])
      ),
      handlerCleanupAttempts: this.handlerCleanupAttempts,
      interactionCooldown: this.interactionCooldown
    };
  }
  
  // ✅ NOUVEAU: Méthode pour reset debug complet
  resetDebug() {
    this.debugCallCount = 0;
    this.debugCallLog = [];
    this.lastInteractionTime = 0;
    this.isRequestingActiveQuests = false;
    
    // Reset tous les hashes
    Object.keys(this.handlerHashes).forEach(handler => {
      this.handlerHashes[handler] = { hash: null, time: 0 };
    });
    
    console.log('🔄 [QuestManager] Debug complet reset avec protection boucles');
  }
  
  // === 🧹 NETTOYAGE AMÉLIORÉ ===
  
  destroy() {
    console.log('🧹 [QuestManager] Destruction avec nettoyage anti-duplication...');
    
    // Nettoyer les handlers agressivement
    this.unregisterHandlers();
    
    this.ready = false;
    this.initialized = false;
    this.handlersRegistered = false;
    
    // Reset debug complet
    this.resetDebug();
    
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
    
    console.log('✅ [QuestManager] Détruit avec protection anti-duplication');
  }
}
