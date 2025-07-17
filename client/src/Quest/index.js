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
    
    this.initialized = false;
    this.componentsReady = false;
    this.connectionAttempts = 0;
    this.maxRetries = 10;
    this.retryDelay = 200;
    this.healthCheck = null;
    this.autoRepairEnabled = true;
    this.lastHealthCheck = 0;
    
    // ✅ NOUVEAU: Référence NetworkManager
    this.networkManager = null;
    
    console.log('📖 [QuestModule] Instance créée');
  }
  
  async init() {
    try {
      console.log('🚀 [QuestModule] Initialisation séquentielle...');
      
      await this.validateDependencies();
      await this.initializeManager();
      this.createComponents();
      await this.waitForComponentsReady();
      this.connectComponents();
      await this.validateSystemIntegrity();
      this.startSystemMonitoring();
      
      this.initialized = true;
      console.log('✅ [QuestModule] Initialisation terminée');
      
      return this;
      
    } catch (error) {
      console.error('❌ [QuestModule] Erreur initialisation:', error);
      await this.attemptRecovery();
      throw error;
    }
  }
  
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
    
    if (typeof this.gameRoom.onMessage !== 'function') {
      throw new Error('gameRoom.onMessage non disponible');
    }
    
    console.log('✅ [QuestModule] Dépendances validées');
  }
  
async initializeManager() {
  console.log('🎯 [QuestModule] Initialisation manager...');
  
  this.manager = new QuestManager(this.gameRoom);
  
  // ✅ NOUVEAU: Connecter NetworkManager si disponible
  if (this.networkManager) {
    await this.manager.init(this.gameRoom, this.networkManager);
  } else if (window.globalNetworkManager) {
    this.networkManager = window.globalNetworkManager;
    await this.manager.init(this.gameRoom, this.networkManager);
  } else {
    await this.manager.init(this.gameRoom);
  }
  
  // ✅ CORRECTION CRITIQUE: Forcer l'enregistrement des handlers
  if (this.manager.registerHandlers && !this.manager._handlersRegistered) {
    console.log('🔧 [QuestModule] Force enregistrement handlers...');
    this.manager.registerHandlers();
  }
  
  // ✅ VÉRIFICATION: S'assurer que les handlers sont bien enregistrés
  setTimeout(() => {
    this.verifyHandlersRegistered();
  }, 1000);
  
  console.log('✅ [QuestModule] Manager initialisé avec handlers forcés');
}

// ✅ NOUVELLE MÉTHODE: Vérification et réparation auto
verifyHandlersRegistered() {
  console.log('🔍 [QuestModule] Vérification handlers...');
  
  if (!this.manager || !this.manager.gameRoom) {
    console.warn('⚠️ [QuestModule] Manager ou GameRoom manquant');
    return;
  }
  
  // Vérifier si les handlers sont enregistrés
  const requiredHandlers = [
    'activeQuestsList',
    'availableQuestsList', 
    'questStartResult',
    'questProgressUpdate',
    'questStatuses'
  ];
  
  const gameRoom = this.manager.gameRoom;
  const missingHandlers = [];
  
  if (gameRoom._messageHandlers) {
    requiredHandlers.forEach(handler => {
      if (!gameRoom._messageHandlers.has(handler)) {
        missingHandlers.push(handler);
      }
    });
  } else {
    missingHandlers.push(...requiredHandlers);
  }
  
  if (missingHandlers.length > 0) {
    console.warn(`⚠️ [QuestModule] Handlers manquants: ${missingHandlers.join(', ')}`);
    console.log('🔧 [QuestModule] Auto-réparation...');
    
    // Force re-registration
    if (this.manager.registerHandlers) {
      this.manager.registerHandlers();
    }
    
    // Vérifier à nouveau dans 2 secondes
    setTimeout(() => {
      this.verifyHandlersRegistered();
    }, 2000);
  } else {
    console.log('✅ [QuestModule] Tous les handlers sont enregistrés');
  }
}
  
  // ✅ NOUVEAU: Setter NetworkManager
  setNetworkManager(networkManager) {
    console.log('🔗 [QuestModule] Configuration NetworkManager...');
    
    this.networkManager = networkManager;
    
    // Si le manager existe déjà, le connecter
    if (this.manager) {
      this.manager.connectNetworkManager(networkManager);
    }
    
    console.log('✅ [QuestModule] NetworkManager configuré');
  }
  
  createComponents() {
    console.log('🔧 [QuestModule] Création composants (BaseModule)...');
    
    this.createComponentsSequential();
    
    console.log('✅ [QuestModule] Composants en cours de création');
  }
  
  async createComponentsSequential() {
    console.log('🔧 [QuestModule] Création composants séquentielle...');
    
    await this.createIconComponent();
    await this.createUIComponent();
    await this.waitForComponentsReady();
    
    this.componentsReady = true;
    console.log('✅ [QuestModule] Composants créés');
  }
  
  async createIconComponent() {
    console.log('🎨 [QuestModule] Création icône...');
    
    if (!this.icon) {
      this.icon = new QuestIcon(this.manager);
      await this.icon.init();
      this.forceIconDisplay();
    }
    
    console.log('✅ [QuestModule] Icône créée');
  }
  
  forceIconDisplay() {
    if (this.icon?.iconElement) {
      const iconEl = this.icon.iconElement;
      
      iconEl.style.position = 'fixed';
      iconEl.style.right = '20px';
      iconEl.style.bottom = '20px';
      iconEl.style.zIndex = '500';
      iconEl.style.display = 'block';
      iconEl.style.visibility = 'visible';
      iconEl.style.opacity = '1';
      iconEl.style.pointerEvents = 'auto';
      
      iconEl.classList.remove('hidden', 'ui-hidden');
      
      console.log('🔧 [QuestModule] Affichage icône forcé');
    }
  }
  
  async createUIComponent() {
    console.log('📱 [QuestModule] Création interface...');
    
    if (!this.ui) {
      this.ui = new QuestUI(this.manager, this.gameRoom);
      await this.ui.init();
      
      if (this.ui.showTracker) {
        this.ui.showTracker();
      }
    }
    
    console.log('✅ [QuestModule] Interface créée');
  }
  
  async waitForComponentsReady() {
    console.log('⏳ [QuestModule] Attente composants...');
    
    const maxWait = 5000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const iconReady = !!(this.icon?.iconElement);
      const uiReady = !!(this.ui?.overlayElement && this.ui?.trackerElement);
      
      if (iconReady && uiReady) {
        console.log('✅ [QuestModule] Composants prêts');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ [QuestModule] Timeout composants:', {
      iconReady: !!(this.icon?.iconElement),
      uiReady: !!(this.ui?.overlayElement && this.ui?.trackerElement)
    });
    
    return false;
  }
  
  connectComponents() {
    console.log('🔗 [QuestModule] Connexion composants (BaseModule)...');
    
    this.connectComponentsRobust();
    
    console.log('✅ [QuestModule] Composants en cours de connexion');
  }
  
  async connectComponentsRobust() {
    console.log('🔗 [QuestModule] Connexion composants robuste...');
    
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        const success = await this.attemptComponentConnection();
        if (success) {
          console.log('✅ [QuestModule] Composants connectés');
          return true;
        }
        
        attempts++;
        console.log(`🔄 [QuestModule] Retry connexion ${attempts}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
      } catch (error) {
        console.error(`❌ [QuestModule] Erreur connexion ${attempts + 1}:`, error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    throw new Error(`Impossible de connecter après ${this.maxRetries} tentatives`);
  }
  
  async attemptComponentConnection() {
    if (!this.icon?.iconElement || !this.ui?.overlayElement) {
      console.log('⏳ [QuestModule] Composants pas prêts');
      return false;
    }
    
    this.connectManagerToIcon();
    this.connectIconToUI();
    this.connectManagerToUI();
    this.connectUIToManager();
    
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
      this.manager.connectQuestUI(this.ui);
      
      this.manager.onQuestUpdate = (quests) => {
        try {
          this.ui.updateQuestData(quests, 'active');
          
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
    
    console.log('✅ [QuestModule] Connexions validées');
    return true;
  }
  
  async validateSystemIntegrity() {
    console.log('🔍 [QuestModule] Validation système...');
    
    const systemChecks = {
      manager: {
        exists: !!this.manager,
        initialized: !!this.manager?.initialized,
        hasGameRoom: !!this.manager?.gameRoom,
        isReady: this.manager?.isReady?.() || false,
        hasNetworkManager: !!this.manager?.networkManager // ✅ NOUVEAU
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
        uiToManager: !!(this.ui?.onAction),
        networkManager: !!(this.networkManager) // ✅ NOUVEAU
      }
    };
    
    const issues = this.analyzeSystemIssues(systemChecks);
    
    if (issues.length > 0) {
      console.error('❌ [QuestModule] Problèmes système:', issues);
      throw new Error(`Échec validation: ${issues.join(', ')}`);
    }
    
    console.log('✅ [QuestModule] Système validé');
    return true;
  }
  
  analyzeSystemIssues(checks) {
    const issues = [];
    
    if (!checks.manager.exists) issues.push('Manager manquant');
    if (!checks.manager.initialized) issues.push('Manager non initialisé');
    
    if (!checks.icon.exists) issues.push('Icône manquante');
    if (!checks.icon.hasElement) issues.push('Élément icône manquant');
    if (!checks.icon.inDOM) issues.push('Icône pas dans DOM');
    
    if (!checks.ui.exists) issues.push('UI manquante');
    if (!checks.ui.hasOverlay) issues.push('Overlay UI manquant');
    if (!checks.ui.hasTracker) issues.push('Tracker UI manquant');
    
    if (!checks.connections.managerToIcon) issues.push('Connexion Manager→Icône manquante');
    if (!checks.connections.managerToUI) issues.push('Connexion Manager→UI manquante');
    if (!checks.connections.iconToUI) issues.push('Connexion Icône→UI manquante');
    
    return issues;
  }
  
  startSystemMonitoring() {
    if (!this.autoRepairEnabled) return;
    
    console.log('👀 [QuestModule] Surveillance démarrée');
    
    this.healthCheck = setInterval(() => {
      this.performHealthCheck();
    }, 10000);
    
    setTimeout(() => this.performHealthCheck(), 2000);
  }
  
  async performHealthCheck() {
    try {
      const now = Date.now();
      this.lastHealthCheck = now;
      
      const issues = await this.detectSystemIssues();
      
      if (issues.length > 0) {
        console.warn('🔧 [QuestModule] Auto-réparation...', issues);
        await this.attemptAutoRepair(issues);
      }
      
    } catch (error) {
      console.error('❌ [QuestModule] Erreur health check:', error);
    }
  }
  
  async detectSystemIssues() {
    const issues = [];
    
    if (!this.icon?.iconElement || !document.contains(this.icon.iconElement)) {
      issues.push('icon-missing');
    } else if (this.icon.iconElement.style.display === 'none') {
      issues.push('icon-hidden');
    }
    
    if (!this.ui?.trackerElement || !document.contains(this.ui.trackerElement)) {
      issues.push('tracker-missing');
    }
    
    if (!this.manager?.questUI) {
      issues.push('manager-ui-disconnected');
    }
    
    // ✅ NOUVEAU: Vérifier connexion NetworkManager
    if (!this.manager?.networkManager && window.globalNetworkManager) {
      issues.push('networkmanager-disconnected');
    }
    
    return issues;
  }
  
  async attemptAutoRepair(issues) {
    console.log('🔧 [QuestModule] Réparation...', issues);
    
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
            
          case 'networkmanager-disconnected':
            await this.repairNetworkManager();
            break;
        }
        
        console.log(`✅ [QuestModule] Réparation '${issue}' réussie`);
        
      } catch (error) {
        console.error(`❌ [QuestModule] Erreur réparation '${issue}':`, error);
      }
    }
  }
  
  // ✅ NOUVEAU: Réparation NetworkManager
  async repairNetworkManager() {
    console.log('🔧 [QuestModule] Réparation NetworkManager...');
    
    if (window.globalNetworkManager && this.manager) {
      this.setNetworkManager(window.globalNetworkManager);
      console.log('✅ [QuestModule] NetworkManager reconnecté');
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
  
  async attemptRecovery() {
    console.log('🔄 [QuestModule] Récupération...');
    
    try {
      this.resetComponents();
      
      if (this.gameRoom) {
        this.manager = new QuestManager(this.gameRoom);
        await this.manager.init(this.gameRoom, this.networkManager);
        await this.createMinimalInterface();
      }
      
      console.log('✅ [QuestModule] Récupération partielle');
      
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
    this.icon = new QuestIcon(this.manager);
    await this.icon.init();
    this.forceIconDisplay();
    
    this.icon.onClick = () => {
      this.showNotification('Quest system en mode récupération', 'warning');
    };
  }
  
  async createIcon() {
    console.log('🎨 [QuestModule] createIcon() pour UIManager');
    
    if (!this.icon?.iconElement) {
      await this.createIconComponent();
    }
    
    if (this.icon?.iconElement) {
      this.forceIconDisplay();
      return this.icon.iconElement;
    }
    
    console.error('❌ [QuestModule] Impossible de créer icône');
    return null;
  }
  
  show() {
    const result = super.show();
    
    if (this.ui?.showTracker) {
      this.ui.showTracker();
    }
    
    if (this.manager?.requestQuestData) {
      setTimeout(() => this.manager.requestQuestData(), 300);
    }
    
    return result;
  }
  
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
      hasNetworkManager: !!this.networkManager, // ✅ NOUVEAU
      manager: {
        exists: !!this.manager,
        initialized: !!this.manager?.initialized,
        isReady: this.manager?.isReady?.() || false,
        hasNetworkManager: !!this.manager?.networkManager
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
  
  destroy() {
    console.log('🧹 [QuestModule] Destruction...');
    
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
      this.healthCheck = null;
    }
    
    this.resetComponents();
    
    if (this.manager) {
      this.manager.destroy?.();
      this.manager = null;
    }
    
    this.networkManager = null; // ✅ NOUVEAU
    this.initialized = false;
    this.autoRepairEnabled = false;
    
    console.log('✅ [QuestModule] Détruit');
  }
  
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
  
  toggleQuestJournal() { return this.toggleUI(); }
  openQuestJournal() { return this.open(); }
  closeQuestJournal() { return this.close(); }
}

export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest...');
    
    const questOptions = {
      singleton: true,
      autoRepair: true,
      ...options
    };
    
    const questInstance = await createModule(QuestModule, 'quest', gameRoom, scene, questOptions);
    
    if (questInstance.startSystemMonitoring) {
      questInstance.startSystemMonitoring();
    }
    
    console.log('✅ [QuestFactory] Module créé');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

export async function repairQuestSystem() {
  console.log('🔧 [QuestRepair] Réparation système...');
  
  try {
    const instance = QuestModule.getInstance('quest');
    
    if (!instance) {
      console.error('❌ [QuestRepair] Aucune instance trouvée');
      return false;
    }
    
    const health = instance.getSystemHealth();
    console.log('📊 [QuestRepair] État:', health);
    
    const issues = await instance.detectSystemIssues();
    
    if (issues.length > 0) {
      console.log('🔧 [QuestRepair] Problèmes:', issues);
      await instance.attemptAutoRepair(issues);
    }
    
    await instance.validateSystemIntegrity();
    
    console.log('✅ [QuestRepair] Réparation terminée');
    return true;
    
  } catch (error) {
    console.error('❌ [QuestRepair] Erreur:', error);
    return false;
  }
}

// === ✅ NOUVELLE FONCTION D'INITIALISATION GLOBALE ===

export async function initializeQuestSystemGlobal(networkManager, gameRoom, scene = null, uiManager = null) {
  console.log('🚀 [QuestSystemBoot] === INITIALISATION GLOBALE ===');
  
  try {
    // === ÉTAPE 1: VALIDATION PRÉREQUIS ===
    console.log('🔍 [QuestSystemBoot] Validation prérequis...');
    
    if (!networkManager) {
      throw new Error('NetworkManager requis');
    }
    
    if (!gameRoom) {
      throw new Error('GameRoom requise');
    }
    
    if (!networkManager.isConnected) {
      console.warn('⚠️ [QuestSystemBoot] NetworkManager pas encore connecté, on continue...');
    }
    
    console.log('✅ [QuestSystemBoot] Prérequis validés');
    
    // === ÉTAPE 2: NETTOYAGE INSTANCE EXISTANTE ===
    console.log('🧹 [QuestSystemBoot] Nettoyage instance existante...');
    
    if (window.questSystem) {
      try {
        window.questSystem.destroy?.();
      } catch (error) {
        console.warn('⚠️ [QuestSystemBoot] Erreur destruction ancienne instance:', error);
      }
    }
    
    // === ÉTAPE 3: CRÉATION QUESTMODULE ===
    console.log('🏗️ [QuestSystemBoot] Création QuestModule...');
    
    const questOptions = {
      singleton: true,
      autoRepair: true,
      keyboardShortcut: 'l',
      autoCloseUI: true
    };
    
    const questModule = await createQuestModule(gameRoom, scene, questOptions);
    
    // === ÉTAPE 4: CONNEXION NETWORKMANAGER ===
    console.log('🔗 [QuestSystemBoot] Connexion NetworkManager...');
    
    questModule.setNetworkManager(networkManager);
    
    // === ÉTAPE 5: CONNEXION UIMANAGER (SI DISPONIBLE) ===
    if (uiManager) {
      console.log('📍 [QuestSystemBoot] Connexion UIManager...');
      
      try {
        await registerQuestModule(uiManager);
        questModule.connectUIManager?.(uiManager);
        console.log('✅ [QuestSystemBoot] UIManager connecté');
      } catch (error) {
        console.warn('⚠️ [QuestSystemBoot] Erreur connexion UIManager:', error);
      }
    }
    
    // === ÉTAPE 6: EXPOSITION GLOBALE ===
    console.log('🌐 [QuestSystemBoot] Exposition globale...');
    
    window.questSystem = questModule;
    window.questSystemGlobal = questModule;
    
    // Fonctions de convenance
    window.toggleQuest = () => questModule.toggleUI();
    window.openQuest = () => questModule.open();
    window.closeQuest = () => questModule.close();
    
    // Fonctions de debug
    window.repairQuestSystem = repairQuestSystem;
    window.getQuestSystemHealth = () => questModule.getSystemHealth();
    
    // Fonctions de gameplay
    window.triggerQuestProgress = (type, data) => questModule.triggerProgress(type, data);
    window.startQuest = (questId) => questModule.startQuest(questId);
    
    // === ÉTAPE 7: VALIDATION FINALE ===
    console.log('🔍 [QuestSystemBoot] Validation finale...');
    
    const health = questModule.getSystemHealth();
    console.log('📊 [QuestSystemBoot] Santé système:', health);
    
    if (!health.initialized) {
      throw new Error('QuestModule non initialisé correctement');
    }
    
    console.log('✅ [QuestSystemBoot] === INITIALISATION RÉUSSIE ===');
    console.log('🎮 [QuestSystemBoot] Quest System prêt à l\'usage !');
    
    return questModule;
    
  } catch (error) {
    console.error('❌ [QuestSystemBoot] Erreur initialisation globale:', error);
    
    // Nettoyer en cas d'erreur
    if (window.questSystem) {
      try {
        window.questSystem.destroy?.();
        window.questSystem = null;
        window.questSystemGlobal = null;
      } catch (cleanupError) {
        console.error('❌ [QuestSystemBoot] Erreur nettoyage:', cleanupError);
      }
    }
    
    throw error;
  }
}

// === ✅ FONCTION UTILITAIRE POUR BOOT RAPIDE ===

export async function quickBootQuestSystem() {
  console.log('⚡ [QuestSystemBoot] Boot rapide...');
  
  try {
    // Chercher les dépendances globales
    const networkManager = window.globalNetworkManager;
    const gameRoom = window.currentGameRoom || networkManager?.room;
    const scene = window.game?.scene?.getScenes?.(true)?.[0];
    const uiManager = window.uiManager;
    
    if (!networkManager) {
      throw new Error('window.globalNetworkManager non trouvé');
    }
    
    if (!gameRoom) {
      throw new Error('GameRoom non trouvée');
    }
    
    console.log('🔍 [QuestSystemBoot] Dépendances trouvées:', {
      networkManager: !!networkManager,
      gameRoom: !!gameRoom,
      scene: !!scene,
      uiManager: !!uiManager
    });
    
    return await initializeQuestSystemGlobal(networkManager, gameRoom, scene, uiManager);
    
  } catch (error) {
    console.error('❌ [QuestSystemBoot] Erreur boot rapide:', error);
    
    console.log('💡 [QuestSystemBoot] Variables globales disponibles:');
    console.log('   window.globalNetworkManager:', !!window.globalNetworkManager);
    console.log('   window.currentGameRoom:', !!window.currentGameRoom);
    console.log('   window.game:', !!window.game);
    console.log('   window.uiManager:', !!window.uiManager);
    
    throw error;
  }
}

export async function setupQuestSystem(uiManager) {
  try {
    console.log('🔧 [QuestSetup] Configuration système...');
    
    const questInstance = await initializeQuestModule(uiManager);
    
    if (!window.questSystem) {
      window.questSystem = questInstance;
      window.questSystemGlobal = questInstance;
      
      window.toggleQuest = () => questInstance.toggleUI();
      window.openQuest = () => questInstance.open();
      window.closeQuest = () => questInstance.close();
      
      window.repairQuestSystem = repairQuestSystem;
      window.getQuestSystemHealth = () => questInstance.getSystemHealth();
      
      window.triggerQuestProgress = (type, data) => questInstance.triggerProgress(type, data);
      window.startQuest = (questId) => questInstance.startQuest(questId);
      
      console.log('🌐 [QuestSetup] Fonctions globales exposées');
    }
    
    console.log('✅ [QuestSetup] Système configuré');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestSetup] Erreur configuration:', error);
    throw error;
  }
}

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
    description: 'Système de quêtes robuste avec auto-réparation',
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
    console.log('📝 [QuestIntegration] Enregistrement...');
    
    if (uiManager.modules?.has('quest')) {
      console.log('ℹ️ [QuestIntegration] Déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('quest', QUEST_MODULE_CONFIG);
    console.log('✅ [QuestIntegration] Enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur:', error);
    throw error;
  }
}

export async function initializeQuestModule(uiManager) {
  try {
    console.log('🚀 [QuestIntegration] Initialisation...');
    
    await registerQuestModule(uiManager);
    
    let questInstance = QuestModule.getInstance('quest');
    
    if (!questInstance || !questInstance.initialized) {
      questInstance = await uiManager.initializeModule('quest');
    } else {
      console.log('ℹ️ [QuestIntegration] Déjà initialisé');
      questInstance.connectUIManager?.(uiManager);
    }
    
    console.log('✅ [QuestIntegration] Terminé');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur:', error);
    throw error;
  }
}

export default QuestModule;

// === 📋 DOCUMENTATION BOOT ===

console.log(`
📖 === QUEST SYSTEM BOOT INTEGRATION ===

🚀 NOUVELLES FONCTIONS D'INITIALISATION:

1. initializeQuestSystemGlobal(networkManager, gameRoom, scene, uiManager)
   → Initialisation complète avec toutes les connexions

2. quickBootQuestSystem()
   → Boot automatique avec détection des dépendances globales

✅ USAGE DANS VOTRE BOOT PRINCIPAL:

// Après création NetworkManager et connexion GameRoom
import { quickBootQuestSystem } from './Quest/index.js';

try {
  const questSystem = await quickBootQuestSystem();
  console.log('Quest System prêt !');
} catch (error) {
  console.error('Erreur Quest System:', error);
}

🔗 CONNEXIONS AUTOMATIQUES:
• NetworkManager → QuestManager (callbacks quest)
• UIManager → QuestModule (positionnement)
• Exposition window.questSystem
• Fonctions globales (toggleQuest, startQuest, etc.)

⚡ BOOT RAPIDE ACTIVÉ !
`);
