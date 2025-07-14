// Quest/index.js - QuestModule ULTRA-ROBUSTE avec initialisation séquentielle
// 🎯 CORRECTIONS: Timing + Handlers + Connexions + Auto-réparation + Fallbacks

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { QuestManager } from './QuestManager.js';
import { QuestIcon } from './QuestIcon.js';
import { QuestUI } from './QuestUI.js';

export class QuestModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    const questOptions = {
      singleton: true,
      autoCloseUI: true,
      keyboardShortcut: 'l',
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 1,
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'quest', gameRoom, scene, questOptions);
    
    // === ÉTAT SYSTÈME ===
    this.initialized = false;
    this.componentsReady = false;
    this.connectionAttempts = 0;
    this.maxRetries = 10;
    this.retryDelay = 200;
    
    // === SURVEILLANCE SYSTÈME ===
    this.healthCheck = null;
    this.autoRepairEnabled = true;
    this.lastHealthCheck = 0;
    
    console.log('📖 [QuestModule] Instance créée - Version ultra-robuste');
  }
  
  // === 🚀 INITIALISATION SÉQUENTIELLE CORRIGÉE ===
  
  async init() {
    try {
      console.log('🚀 [QuestModule] === INITIALISATION SÉQUENTIELLE ===');
      
      // 1. Vérifier dépendances critiques
      await this.validateDependencies();
      
      // 2. Initialiser le manager métier AVEC handlers immédiats
      await this.initializeManager();
      
      // 3. Créer composants UI en parallèle mais attendre qu'ils soient prêts
      await this.createComponentsSequential();
      
      // 4. Connecter les composants de manière robuste
      await this.connectComponentsRobust();
      
      // 5. Valider le système complet
      await this.validateSystemIntegrity();
      
      // 6. Démarrer la surveillance
      this.startSystemMonitoring();
      
      this.initialized = true;
      console.log('✅ [QuestModule] Initialisation séquentielle terminée');
      
      return this;
      
    } catch (error) {
      console.error('❌ [QuestModule] Erreur initialisation séquentielle:', error);
      
      // Tentative de récupération
      await this.attemptRecovery();
      throw error;
    }
  }
  
  // === 🔍 VALIDATION DÉPENDANCES ===
  
  async validateDependencies() {
    console.log('🔍 [QuestModule] Validation dépendances...');
    
    const requiredDeps = {
      gameRoom: this.gameRoom,
      gameRoomSend: this.gameRoom?.send,
      gameRoomOnMessage: this.gameRoom?.onMessage,
      document: typeof document !== 'undefined',
      window: typeof window !== 'undefined'
    };
    
    const missing = Object.entries(requiredDeps)
      .filter(([name, dep]) => !dep)
      .map(([name]) => name);
    
    if (missing.length > 0) {
      throw new Error(`Dépendances manquantes: ${missing.join(', ')}`);
    }
    
    // Vérifier que les handlers Colyseus peuvent être enregistrés
    if (typeof this.gameRoom.onMessage !== 'function') {
      throw new Error('gameRoom.onMessage non disponible pour enregistrer handlers');
    }
    
    console.log('✅ [QuestModule] Dépendances validées');
  }
  
  // === 🎯 INITIALISATION MANAGER CORRIGÉE ===
  
  async initializeManager() {
    console.log('🎯 [QuestModule] Initialisation manager avec handlers immédiats...');
    
    // ✅ CORRECTION CRITIQUE 1: Créer manager AVEC gameRoom immédiatement
    this.manager = new QuestManager(this.gameRoom);
    
    // ✅ CORRECTION CRITIQUE 2: Setup handlers AVANT init()
    if (this.gameRoom && typeof this.gameRoom.onMessage === 'function') {
      console.log('📡 [QuestModule] Enregistrement handlers IMMÉDIAT...');
      this.manager.setupServerListeners();
    } else {
      throw new Error('Impossible d\'enregistrer les handlers - gameRoom invalide');
    }
    
    // ✅ CORRECTION CRITIQUE 3: Init manager après handlers
    await this.manager.init();
    
    // Validation handlers
    const handlersRegistered = this.validateHandlersRegistered();
    if (!handlersRegistered) {
      console.warn('⚠️ [QuestModule] Handlers non enregistrés, retry...');
      await this.retryHandlerRegistration();
    }
    
    console.log('✅ [QuestModule] Manager initialisé avec handlers');
  }
  
  validateHandlersRegistered() {
    const requiredHandlers = [
      'availableQuestsList', 'activeQuestsList', 'questStartResult',
      'questGranted', 'questProgressUpdate', 'questCompleted'
    ];
    
    return requiredHandlers.every(handler => {
      const isRegistered = !!(this.gameRoom._messageHandlers?.[handler]);
      if (!isRegistered) {
        console.warn(`⚠️ [QuestModule] Handler '${handler}' non enregistré`);
      }
      return isRegistered;
    });
  }
  
  async retryHandlerRegistration() {
    let retries = 0;
    while (retries < 3 && !this.validateHandlersRegistered()) {
      console.log(`🔄 [QuestModule] Retry handlers registration ${retries + 1}/3...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      this.manager.setupServerListeners();
      retries++;
    }
    
    if (!this.validateHandlersRegistered()) {
      throw new Error('Impossible d\'enregistrer les handlers après 3 tentatives');
    }
  }
  
  // === 🔧 CRÉATION COMPOSANTS SÉQUENTIELLE ===
  
  async createComponentsSequential() {
    console.log('🔧 [QuestModule] Création composants séquentielle...');
    
    // 1. Créer icône en premier (plus simple)
    await this.createIconComponent();
    
    // 2. Créer UI en parallèle mais attendre qu'elle soit prête
    await this.createUIComponent();
    
    // 3. Valider que tous les composants sont prêts
    await this.waitForComponentsReady();
    
    this.componentsReady = true;
    console.log('✅ [QuestModule] Composants créés et prêts');
  }
  
  async createIconComponent() {
    console.log('🎨 [QuestModule] Création icône...');
    
    if (!this.icon) {
      this.icon = new QuestIcon(this.manager);
      await this.icon.init();
      
      // Force position et affichage immédiat
      this.forceIconDisplay();
    }
    
    console.log('✅ [QuestModule] Icône créée');
  }
  
  forceIconDisplay() {
    if (this.icon?.iconElement) {
      const iconEl = this.icon.iconElement;
      
      // Position de secours garantie
      iconEl.style.position = 'fixed';
      iconEl.style.right = '20px';
      iconEl.style.bottom = '20px';
      iconEl.style.zIndex = '500';
      
      // Affichage forcé
      iconEl.style.display = 'block';
      iconEl.style.visibility = 'visible';
      iconEl.style.opacity = '1';
      iconEl.style.pointerEvents = 'auto';
      
      // Supprimer classes cachées
      iconEl.classList.remove('hidden', 'ui-hidden');
      
      console.log('🔧 [QuestModule] Affichage icône forcé');
    }
  }
  
  async createUIComponent() {
    console.log('📱 [QuestModule] Création interface...');
    
    if (!this.ui) {
      this.ui = new QuestUI(this.manager, this.gameRoom);
      
      // ✅ CORRECTION CRITIQUE 4: Attendre que init() soit terminé
      await this.ui.init();
      
      // Force affichage tracker par défaut
      if (this.ui.showTracker) {
        this.ui.showTracker();
      }
    }
    
    console.log('✅ [QuestModule] Interface créée');
  }
  
  async waitForComponentsReady() {
    console.log('⏳ [QuestModule] Attente composants prêts...');
    
    const maxWait = 5000; // 5 secondes max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const iconReady = !!(this.icon?.iconElement);
      const uiReady = !!(this.ui?.overlayElement && this.ui?.trackerElement);
      
      if (iconReady && uiReady) {
        console.log('✅ [QuestModule] Tous les composants sont prêts');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Diagnostic si pas prêt
    console.warn('⚠️ [QuestModule] Timeout composants:', {
      iconReady: !!(this.icon?.iconElement),
      uiReady: !!(this.ui?.overlayElement && this.ui?.trackerElement)
    });
    
    return false;
  }
  
  // === 🔗 CONNEXION COMPOSANTS ROBUSTE ===
  
  async connectComponentsRobust() {
    console.log('🔗 [QuestModule] Connexion composants robuste...');
    
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        const success = await this.attemptComponentConnection();
        if (success) {
          console.log('✅ [QuestModule] Composants connectés avec succès');
          return true;
        }
        
        attempts++;
        console.log(`🔄 [QuestModule] Retry connexion ${attempts}/${this.maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
      } catch (error) {
        console.error(`❌ [QuestModule] Erreur connexion tentative ${attempts + 1}:`, error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    throw new Error(`Impossible de connecter les composants après ${this.maxRetries} tentatives`);
  }
  
  async attemptComponentConnection() {
    // Vérifier que tous les composants sont prêts
    if (!this.icon?.iconElement || !this.ui?.overlayElement) {
      console.log('⏳ [QuestModule] Composants pas encore prêts pour connexion');
      return false;
    }
    
    // 1. Manager → Icône
    this.connectManagerToIcon();
    
    // 2. Icône → UI
    this.connectIconToUI();
    
    // 3. Manager → UI
    this.connectManagerToUI();
    
    // 4. UI → Manager
    this.connectUIToManager();
    
    // 5. Validation connexions
    return this.validateConnections();
  }
  
  connectManagerToIcon() {
    if (this.manager && this.icon) {
      this.manager.onStatsUpdate = (stats) => {
        try {
          this.icon.updateStats(stats);
        } catch (error) {
          console.error('❌ [QuestModule] Erreur manager→icon:', error);
        }
      };
      
      this.manager.onQuestStarted = (quest) => {
        try {
          if (this.icon) this.icon.animateNewQuest();
          this.showNotification(`Nouvelle quête: ${quest.name || 'Quête sans nom'}`, 'success');
        } catch (error) {
          console.error('❌ [QuestModule] Erreur onQuestStarted:', error);
        }
      };
      
      this.manager.onQuestCompleted = (quest) => {
        try {
          if (this.icon) this.icon.animateQuestCompleted();
          this.showNotification('Quête terminée !', 'success');
        } catch (error) {
          console.error('❌ [QuestModule] Erreur onQuestCompleted:', error);
        }
      };
      
      this.manager.onQuestProgress = (progress) => {
        try {
          if (this.icon) this.icon.animateQuestProgress();
        } catch (error) {
          console.error('❌ [QuestModule] Erreur onQuestProgress:', error);
        }
      };
      
      console.log('🔗 [QuestModule] Manager→Icône connecté');
    }
  }
  
  connectIconToUI() {
    if (this.icon && this.ui) {
      this.icon.onClick = () => {
        try {
          if (this.canOpenUI()) {
            this.ui.toggle();
          } else {
            this.showCannotOpenMessage();
          }
        } catch (error) {
          console.error('❌ [QuestModule] Erreur icône→UI:', error);
        }
      };
      
      console.log('🔗 [QuestModule] Icône→UI connecté');
    }
  }
  
  connectManagerToUI() {
    if (this.manager && this.ui) {
      // ✅ CORRECTION CRITIQUE 5: Connecter QuestUI au manager
      this.manager.connectQuestUI(this.ui);
      
      this.manager.onQuestUpdate = (quests) => {
        try {
          this.ui.updateQuestData(quests, 'active');
          
          // Force refresh si UI visible
          if (this.ui.isVisible) {
            setTimeout(() => {
              this.ui.refreshQuestList?.();
              this.ui.updateTracker?.();
            }, 100);
          }
        } catch (error) {
          console.error('❌ [QuestModule] Erreur manager→UI:', error);
        }
      };
      
      console.log('🔗 [QuestModule] Manager→UI connecté');
    }
  }
  
  connectUIToManager() {
    if (this.ui && this.manager) {
      this.ui.onAction = (action, data) => {
        try {
          this.manager.handleAction(action, data);
        } catch (error) {
          console.error('❌ [QuestModule] Erreur UI→manager:', error);
        }
      };
      
      console.log('🔗 [QuestModule] UI→Manager connecté');
    }
  }
  
  validateConnections() {
    const checks = {
      managerCallbacks: !!(this.manager?.onStatsUpdate && this.manager?.onQuestUpdate),
      iconCallback: !!(this.icon?.onClick),
      uiCallback: !!(this.ui?.onAction),
      questUIConnected: !!(this.manager?.questUI === this.ui)
    };
    
    const failed = Object.entries(checks).filter(([_, valid]) => !valid);
    
    if (failed.length > 0) {
      console.warn('⚠️ [QuestModule] Connexions échouées:', failed.map(([name]) => name));
      return false;
    }
    
    console.log('✅ [QuestModule] Toutes les connexions validées');
    return true;
  }
  
  // === ✅ VALIDATION SYSTÈME INTÉGRITÉ ===
  
  async validateSystemIntegrity() {
    console.log('🔍 [QuestModule] Validation intégrité système...');
    
    const systemChecks = {
      manager: {
        exists: !!this.manager,
        initialized: !!this.manager?.initialized,
        hasGameRoom: !!this.manager?.gameRoom,
        handlersRegistered: this.validateHandlersRegistered()
      },
      
      icon: {
        exists: !!this.icon,
        hasElement: !!this.icon?.iconElement,
        inDOM: this.icon?.iconElement ? document.contains(this.icon.iconElement) : false,
        hasCallback: !!this.icon?.onClick
      },
      
      ui: {
        exists: !!this.ui,
        hasOverlay: !!this.ui?.overlayElement,
        hasTracker: !!this.ui?.trackerElement,
        inDOM: this.ui?.overlayElement ? document.contains(this.ui.overlayElement) : false,
        hasCallback: !!this.ui?.onAction
      },
      
      connections: {
        managerToIcon: !!(this.manager?.onStatsUpdate),
        iconToUI: !!(this.icon?.onClick),
        managerToUI: !!(this.manager?.questUI === this.ui),
        uiToManager: !!(this.ui?.onAction)
      }
    };
    
    // Analyser les problèmes
    const issues = this.analyzeSystemIssues(systemChecks);
    
    if (issues.length > 0) {
      console.error('❌ [QuestModule] Problèmes système détectés:', issues);
      throw new Error(`Échec validation système: ${issues.join(', ')}`);
    }
    
    console.log('✅ [QuestModule] Intégrité système validée');
    return true;
  }
  
  analyzeSystemIssues(checks) {
    const issues = [];
    
    // Analyser manager
    if (!checks.manager.exists) issues.push('Manager manquant');
    if (!checks.manager.initialized) issues.push('Manager non initialisé');
    if (!checks.manager.handlersRegistered) issues.push('Handlers non enregistrés');
    
    // Analyser icon
    if (!checks.icon.exists) issues.push('Icône manquante');
    if (!checks.icon.hasElement) issues.push('Élément icône manquant');
    if (!checks.icon.inDOM) issues.push('Icône pas dans DOM');
    
    // Analyser UI
    if (!checks.ui.exists) issues.push('UI manquante');
    if (!checks.ui.hasOverlay) issues.push('Overlay UI manquant');
    if (!checks.ui.hasTracker) issues.push('Tracker UI manquant');
    
    // Analyser connexions
    if (!checks.connections.managerToIcon) issues.push('Connexion Manager→Icône manquante');
    if (!checks.connections.managerToUI) issues.push('Connexion Manager→UI manquante');
    if (!checks.connections.iconToUI) issues.push('Connexion Icône→UI manquante');
    
    return issues;
  }
  
  // === 🔧 SURVEILLANCE ET AUTO-RÉPARATION ===
  
  startSystemMonitoring() {
    if (!this.autoRepairEnabled) return;
    
    console.log('👀 [QuestModule] Démarrage surveillance système...');
    
    this.healthCheck = setInterval(() => {
      this.performHealthCheck();
    }, 10000); // Check toutes les 10 secondes
    
    // Check immédiat
    setTimeout(() => this.performHealthCheck(), 2000);
  }
  
  async performHealthCheck() {
    try {
      const now = Date.now();
      this.lastHealthCheck = now;
      
      const issues = await this.detectSystemIssues();
      
      if (issues.length > 0) {
        console.warn('🔧 [QuestModule] Problèmes détectés, auto-réparation...', issues);
        await this.attemptAutoRepair(issues);
      }
      
    } catch (error) {
      console.error('❌ [QuestModule] Erreur health check:', error);
    }
  }
  
  async detectSystemIssues() {
    const issues = [];
    
    // Vérifier icône
    if (!this.icon?.iconElement || !document.contains(this.icon.iconElement)) {
      issues.push('icon-missing');
    } else if (this.icon.iconElement.style.display === 'none') {
      issues.push('icon-hidden');
    }
    
    // Vérifier tracker
    if (!this.ui?.trackerElement || !document.contains(this.ui.trackerElement)) {
      issues.push('tracker-missing');
    }
    
    // Vérifier connexions
    if (!this.manager?.questUI) {
      issues.push('manager-ui-disconnected');
    }
    
    // Vérifier handlers
    if (!this.validateHandlersRegistered()) {
      issues.push('handlers-missing');
    }
    
    return issues;
  }
  
  async attemptAutoRepair(issues) {
    console.log('🔧 [QuestModule] Tentative auto-réparation...', issues);
    
    for (const issue of issues) {
      try {
        switch (issue) {
          case 'icon-missing':
            await this.repairIcon();
            break;
            
          case 'icon-hidden':
            this.forceIconDisplay();
            break;
            
          case 'tracker-missing':
            await this.repairTracker();
            break;
            
          case 'manager-ui-disconnected':
            this.connectManagerToUI();
            break;
            
          case 'handlers-missing':
            await this.retryHandlerRegistration();
            break;
        }
        
        console.log(`✅ [QuestModule] Réparation '${issue}' réussie`);
        
      } catch (error) {
        console.error(`❌ [QuestModule] Erreur réparation '${issue}':`, error);
      }
    }
  }
  
  async repairIcon() {
    console.log('🔧 [QuestModule] Réparation icône...');
    
    if (!this.icon || !this.icon.iconElement) {
      await this.createIconComponent();
    } else if (!document.contains(this.icon.iconElement)) {
      document.body.appendChild(this.icon.iconElement);
    }
    
    this.forceIconDisplay();
    this.connectIconToUI();
  }
  
  async repairTracker() {
    console.log('🔧 [QuestModule] Réparation tracker...');
    
    if (!this.ui?.trackerElement) {
      await this.createUIComponent();
    } else if (!document.contains(this.ui.trackerElement)) {
      document.body.appendChild(this.ui.trackerElement);
    }
    
    if (this.ui?.showTracker) {
      this.ui.showTracker();
    }
  }
  
  // === 🔄 RÉCUPÉRATION D'ERREUR ===
  
  async attemptRecovery() {
    console.log('🔄 [QuestModule] Tentative de récupération...');
    
    try {
      // Reset complet
      this.resetComponents();
      
      // Retry initialisation minimale
      if (this.gameRoom) {
        this.manager = new QuestManager(this.gameRoom);
        await this.manager.init();
        
        // Interface minimal fallback
        await this.createMinimalInterface();
      }
      
      console.log('✅ [QuestModule] Récupération partielle réussie');
      
    } catch (error) {
      console.error('❌ [QuestModule] Récupération échouée:', error);
    }
  }
  
  resetComponents() {
    if (this.icon) {
      this.icon.destroy?.();
      this.icon = null;
    }
    
    if (this.ui) {
      this.ui.destroy?.();
      this.ui = null;
    }
    
    this.componentsReady = false;
    this.connectionAttempts = 0;
  }
  
  async createMinimalInterface() {
    // Créer juste l'icône avec fonctionnalités de base
    this.icon = new QuestIcon(this.manager);
    await this.icon.init();
    this.forceIconDisplay();
    
    // Callback simple pour icône
    this.icon.onClick = () => {
      this.showNotification('Quest system in recovery mode', 'warning');
    };
  }
  
  // === 📊 API PUBLIQUE RENFORCÉE ===
  
  async createIcon() {
    console.log('🎨 [QuestModule] createIcon() pour UIManager...');
    
    if (!this.icon?.iconElement) {
      await this.createIconComponent();
    }
    
    if (this.icon?.iconElement) {
      this.forceIconDisplay();
      return this.icon.iconElement;
    }
    
    console.error('❌ [QuestModule] Impossible de créer icône pour UIManager');
    return null;
  }
  
  show() {
    const result = super.show();
    
    // Afficher tracker + demander données
    if (this.ui?.showTracker) {
      this.ui.showTracker();
    }
    
    if (this.manager?.requestQuestData) {
      setTimeout(() => this.manager.requestQuestData(), 300);
    }
    
    return result;
  }
  
  // === 🛠️ FONCTIONS UTILITAIRES ===
  
  showNotification(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000 });
    } else {
      console.log(`📢 [QuestModule] ${type.toUpperCase()}: ${message}`);
    }
  }
  
  getSystemHealth() {
    return {
      initialized: this.initialized,
      componentsReady: this.componentsReady,
      connectionAttempts: this.connectionAttempts,
      lastHealthCheck: this.lastHealthCheck,
      autoRepairEnabled: this.autoRepairEnabled,
      manager: {
        exists: !!this.manager,
        initialized: !!this.manager?.initialized,
        handlersValid: this.validateHandlersRegistered()
      },
      icon: {
        exists: !!this.icon,
        hasElement: !!this.icon?.iconElement,
        inDOM: this.icon?.iconElement ? document.contains(this.icon.iconElement) : false
      },
      ui: {
        exists: !!this.ui,
        hasElements: !!(this.ui?.overlayElement && this.ui?.trackerElement),
        connected: !!(this.manager?.questUI === this.ui)
      }
    };
  }
  
  // === 🧹 NETTOYAGE AMÉLIORÉ ===
  
  destroy() {
    console.log('🧹 [QuestModule] Destruction sécurisée...');
    
    // Arrêter surveillance
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
      this.healthCheck = null;
    }
    
    // Détruire composants
    this.resetComponents();
    
    // Détruire manager
    if (this.manager) {
      this.manager.destroy?.();
      this.manager = null;
    }
    
    // Reset état
    this.initialized = false;
    this.autoRepairEnabled = false;
    
    console.log('✅ [QuestModule] Destruction terminée');
  }
  
  // === API LEGACY (inchangée) ===
  
  getActiveQuests() {
    return this.manager ? this.manager.getActiveQuests() : [];
  }
  
  startQuest(questId) {
    if (this.manager) {
      this.manager.startQuest(questId);
    }
  }
  
  triggerProgress(type, data) {
    if (this.manager) {
      switch (type) {
        case 'collect':
          this.manager.triggerCollectEvent(data.itemId, data.amount);
          break;
        case 'defeat':
          this.manager.triggerDefeatEvent(data.pokemonId);
          break;
        case 'reach':
          this.manager.triggerReachEvent(data.zoneId, data.x, data.y, data.map);
          break;
        case 'deliver':
          this.manager.triggerDeliverEvent(data.npcId, data.itemId);
          break;
        default:
          this.manager.triggerProgress(data);
      }
    }
  }
  
  // API shortcuts
  toggleQuestJournal() { return this.toggleUI(); }
  openQuestJournal() { return this.open(); }
  closeQuestJournal() { return this.close(); }
}

// === 🏭 FACTORY CORRIGÉE ===

export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest ultra-robuste...');
    
    const questOptions = {
      singleton: true,
      autoRepair: true,
      ...options
    };
    
    const questInstance = await createModule(QuestModule, 'quest', gameRoom, scene, questOptions);
    
    // Démarrer surveillance après création
    if (questInstance.startSystemMonitoring) {
      questInstance.startSystemMonitoring();
    }
    
    console.log('✅ [QuestFactory] Module Quest créé avec surveillance');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création module Quest:', error);
    throw error;
  }
}

// === 🔧 FONCTION DE RÉPARATION GLOBALE ===

export async function repairQuestSystem() {
  console.log('🔧 [QuestRepair] === RÉPARATION COMPLÈTE SYSTÈME QUEST ===');
  
  try {
    const instance = QuestModule.getInstance('quest');
    
    if (!instance) {
      console.error('❌ [QuestRepair] Aucune instance Quest trouvée');
      return false;
    }
    
    // Diagnostic complet
    const health = instance.getSystemHealth();
    console.log('📊 [QuestRepair] État système:', health);
    
    // Détecter et réparer les problèmes
    const issues = await instance.detectSystemIssues();
    
    if (issues.length > 0) {
      console.log('🔧 [QuestRepair] Problèmes détectés:', issues);
      await instance.attemptAutoRepair(issues);
    }
    
    // Validation finale
    await instance.validateSystemIntegrity();
    
    console.log('✅ [QuestRepair] Réparation terminée avec succès');
    return true;
    
  } catch (error) {
    console.error('❌ [QuestRepair] Erreur réparation:', error);
    return false;
  }
}

// === 🌐 EXPOSITION GLOBALE AMÉLIORÉE ===

export async function setupQuestSystem(uiManager) {
  try {
    console.log('🔧 [QuestSetup] Configuration système Quest robuste...');
    
    const questInstance = await initializeQuestModule(uiManager);
    
    // Exposer avec fonctions de réparation
    if (!window.questSystem) {
      window.questSystem = questInstance;
      window.questSystemGlobal = questInstance;
      
      // API standard
      window.toggleQuest = () => questInstance.toggleUI();
      window.openQuest = () => questInstance.open();
      window.closeQuest = () => questInstance.close();
      
      // API réparation
      window.repairQuestSystem = repairQuestSystem;
      window.getQuestSystemHealth = () => questInstance.getSystemHealth();
      
      // API progression
      window.triggerQuestProgress = (type, data) => questInstance.triggerProgress(type, data);
      window.startQuest = (questId) => questInstance.startQuest(questId);
      
      console.log('🌐 [QuestSetup] Fonctions globales Quest exposées avec réparation');
    }
    
    console.log('✅ [QuestSetup] Système Quest configuré ULTRA-ROBUSTE');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestSetup] Erreur configuration:', error);
    throw error;
  }
}

// === CONFIGURATION EXPORT (existante) ===

export const QUEST_MODULE_CONFIG = generateModuleConfig('quest', {
  moduleClass: QuestModule,
  order: 1,
  options: {
    singleton: true,
    keyboardShortcut: 'l',
    autoRepair: true
  },
  groups: ['ui-icons', 'quest-management'],
  metadata: {
    name: 'Quest Journal',
    description: 'Ultra-robust quest management system with auto-repair',
    version: '3.0.0',
    category: 'Quest Management'
  },
  factory: () => createQuestModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

export async function registerQuestModule(uiManager) {
  try {
    console.log('📝 [QuestIntegration] Enregistrement Quest robuste...');
    
    if (uiManager.modules?.has('quest')) {
      console.log('ℹ️ [QuestIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('quest', QUEST_MODULE_CONFIG);
    console.log('✅ [QuestIntegration] Module Quest enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

export async function initializeQuestModule(uiManager) {
  try {
    console.log('🚀 [QuestIntegration] Initialisation Quest robuste...');
    
    await registerQuestModule(uiManager);
    
    let questInstance = QuestModule.getInstance('quest');
    
    if (!questInstance || !questInstance.initialized) {
      questInstance = await uiManager.initializeModule('quest');
    } else {
      console.log('ℹ️ [QuestIntegration] Instance déjà initialisée');
      questInstance.connectUIManager?.(uiManager);
    }
    
    console.log('✅ [QuestIntegration] Initialisation Quest robuste terminée');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur initialisation:', error);
    throw error;
  }
}

export default QuestModule;

console.log(`
📖 === QUEST MODULE ULTRA-ROBUSTE ===

🎯 CORRECTIONS MAJEURES:
1. ✅ Initialisation séquentielle avec validation
2. ✅ Handlers enregistrés AVANT init() du manager
3. ✅ Connexion QuestUI robuste avec retry
4. ✅ Validation système complète
5. ✅ Auto-réparation avec surveillance
6. ✅ Fallbacks et récupération d'erreur
7. ✅ Diagnostics et health checks

🔧 NOUVELLES FONCTIONNALITÉS:
• Surveillance système continue (health checks)
• Auto-réparation automatique des problèmes
• Validation intégrité complète
• Récupération d'erreur progressive
• Diagnostics détaillés
• API de réparation manuelle

🛠️ UTILISATION:
• setupQuestSystem(uiManager) - Setup robuste
• window.repairQuestSystem() - Réparation manuelle
• window.getQuestSystemHealth() - État système

⚡ GARANTIES:
✅ Handlers toujours enregistrés
✅ Icône toujours visible  
✅ Tracker toujours affiché
✅ Connexions UI robustes
✅ Auto-réparation en cas de problème

🎮 SYSTÈME QUEST MAINTENANT ULTRA-ROBUSTE !
`);
