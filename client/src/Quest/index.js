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
      
      // ✅ ENREGISTREMENT GLOBAL IMMÉDIAT
      this.forceGlobalRegistration();
      
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
  
  // ✅ NOUVELLE MÉTHODE: Enregistrement global forcé
  forceGlobalRegistration() {
    console.log('🌐 [QuestModule] === ENREGISTREMENT GLOBAL FORCÉ ===');
    
    // Enregistrer QuestModule
    window.questSystem = this;
    window.questSystemGlobal = this;
    window.questModule = this;
    
    // Enregistrer QuestManager
    if (this.manager) {
      window.questManager = this.manager;
      window.questManagerGlobal = this.manager;
      
      // Alias pour compatibilité
      window.questSystem.manager = this.manager;
      window.questSystem.handleNpcInteraction = this.manager.handleNpcInteraction?.bind(this.manager);
    }
    
    // Enregistrer QuestUI
    if (this.ui) {
      window.questUI = this.ui;
      window.questUIGlobal = this.ui;
    }
    
    // Enregistrer QuestIcon
    if (this.icon) {
      window.questIcon = this.icon;
      window.questIconGlobal = this.icon;
    }
    
    // ✅ FONCTIONS GLOBALES PRATIQUES
    window.getQuestSystem = () => this;
    window.getQuestManager = () => this.manager;
    window.getQuestUI = () => this.ui;
    window.getQuestIcon = () => this.icon;
    
    // ✅ FONCTIONS DE CONTRÔLE
    window.toggleQuest = () => this.toggleUI();
    window.openQuest = () => this.open();
    window.closeQuest = () => this.close();
    window.showQuestJournal = () => this.open();
    window.hideQuestJournal = () => this.close();
    
    // ✅ FONCTIONS GAMEPLAY
    window.startQuest = (questId) => this.startQuest(questId);
    window.getActiveQuests = () => this.getActiveQuests();
    window.triggerQuestProgress = (type, data) => this.triggerProgress(type, data);
    
    // ✅ FONCTIONS DEBUG
    window.getQuestSystemHealth = () => this.getSystemHealth();
    window.repairQuestSystem = () => this.forceRepair();
    window.debugQuestSystem = () => {
      console.log('🔍 [QuestSystem] Debug:', {
        module: !!this,
        manager: !!this.manager,
        ui: !!this.ui,
        icon: !!this.icon,
        initialized: this.initialized,
        componentsReady: this.componentsReady
      });
    };
    
    // ✅ COMPATIBILITÉ INTERACTIONMANAGER
    window.questSystem.handleNpcInteraction = this.handleNpcInteraction.bind(this);
    
    console.log('✅ [QuestModule] Enregistrement global terminé');
    console.log('🎮 [QuestModule] Variables globales disponibles:');
    console.log('   - window.questSystem');
    console.log('   - window.questManager');
    console.log('   - window.questUI');
    console.log('   - window.questIcon');
    console.log('   - window.getQuestSystem()');
    console.log('   - window.toggleQuest()');
    console.log('   - window.startQuest(id)');
  }
  
  // ✅ MÉTHODE PROXY POUR INTERACTION NPC
  handleNpcInteraction(data) {
    console.log('🎯 [QuestModule] handleNpcInteraction appelé:', data);
    
    if (!this.manager) {
      console.warn('⚠️ [QuestModule] Manager non disponible');
      return 'NO_QUEST';
    }
    
    if (typeof this.manager.handleNpcInteraction !== 'function') {
      console.warn('⚠️ [QuestModule] Manager.handleNpcInteraction non disponible');
      return 'NO_QUEST';
    }
    
    try {
      const result = this.manager.handleNpcInteraction(data);
      console.log(`✅ [QuestModule] Résultat interaction: ${result}`);
      return result;
    } catch (error) {
      console.error('❌ [QuestModule] Erreur handleNpcInteraction:', error);
      return 'ERROR';
    }
  }
  
  // ✅ MÉTHODE DE RÉPARATION FORCÉE
  async forceRepair() {
    console.log('🔧 [QuestModule] === RÉPARATION FORCÉE ===');
    
    try {
      // 1. Vérifier les composants
      if (!this.manager && this.gameRoom) {
        console.log('🔧 [QuestModule] Recréation Manager...');
        this.manager = new QuestManager();
        await this.manager.setup(this.gameRoom);
      }
      
      if (!this.icon) {
        console.log('🔧 [QuestModule] Recréation Icône...');
        this.icon = new QuestIcon(this.manager);
        await this.icon.init();
        this.forceIconDisplay();
      }
      
      if (!this.ui) {
        console.log('🔧 [QuestModule] Recréation UI...');
        this.ui = new QuestUI(this.manager, this.gameRoom);
        await this.ui.init();
      }
      
      // 2. Reconnecter
      this.connectComponents();
      
      // 3. Re-enregistrer globalement
      this.forceGlobalRegistration();
      
      console.log('✅ [QuestModule] Réparation terminée');
      return true;
      
    } catch (error) {
      console.error('❌ [QuestModule] Erreur réparation:', error);
      return false;
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
    
    this.manager = new QuestManager();
    await this.manager.setup(this.gameRoom);
    
    // ✅ Connexion NetworkManager si disponible
    if (this.networkManager) {
      this.manager.networkManager = this.networkManager;
    } else if (window.globalNetworkManager) {
      this.networkManager = window.globalNetworkManager;
      this.manager.networkManager = this.networkManager;
    }
    
    console.log('✅ [QuestModule] Manager initialisé');
  }
  
  setNetworkManager(networkManager) {
    console.log('🔗 [QuestModule] Configuration NetworkManager...');
    
    this.networkManager = networkManager;
    
    if (this.manager) {
      this.manager.networkManager = networkManager;
    }
    
    console.log('✅ [QuestModule] NetworkManager configuré');
  }
  
  createComponents() {
    console.log('🔧 [QuestModule] Création composants...');
    
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
    
    console.warn('⚠️ [QuestModule] Timeout composants');
    return false;
  }
  
  connectComponents() {
    console.log('🔗 [QuestModule] Connexion composants...');
    
    this.connectComponentsRobust();
    
    console.log('✅ [QuestModule] Composants connectés');
  }
  
  async connectComponentsRobust() {
    console.log('🔗 [QuestModule] Connexion composants robuste...');
    
    this.connectManagerToIcon();
    this.connectIconToUI();
    this.connectManagerToUI();
    this.connectUIToManager();
    
    console.log('✅ [QuestModule] Connexions établies');
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
      this.manager.questUI = this.ui;
      
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
  
  async validateSystemIntegrity() {
    console.log('🔍 [QuestModule] Validation système...');
    
    const systemChecks = {
      manager: !!this.manager,
      icon: !!this.icon,
      ui: !!this.ui,
      managerReady: this.manager?.isReady?.() || false,
      iconElement: !!this.icon?.iconElement,
      uiElements: !!(this.ui?.overlayElement && this.ui?.trackerElement)
    };
    
    const issues = Object.entries(systemChecks)
      .filter(([name, valid]) => !valid)
      .map(([name]) => name);
    
    if (issues.length > 0) {
      console.warn('⚠️ [QuestModule] Problèmes système:', issues);
      // Ne pas throw, juste logger
    }
    
    console.log('✅ [QuestModule] Système validé');
    return true;
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
      
      // Vérifier enregistrement global
      if (!window.questSystem || !window.questManager) {
        console.log('🔧 [QuestModule] Re-enregistrement global...');
        this.forceGlobalRegistration();
      }
      
      // Vérifier icône
      if (!this.icon?.iconElement || !document.contains(this.icon.iconElement)) {
        console.log('🔧 [QuestModule] Réparation icône...');
        await this.createIconComponent();
      }
      
    } catch (error) {
      console.error('❌ [QuestModule] Erreur health check:', error);
    }
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
  
  canOpenUI() {
    return this.isEnabled && this.ui && !this.ui.isVisible;
  }
  
  showCannotOpenMessage() {
    this.showNotification('Interface de quêtes non disponible', 'warning');
  }
  
  getSystemHealth() {
    return {
      initialized: this.initialized,
      componentsReady: this.componentsReady,
      hasNetworkManager: !!this.networkManager,
      globalRegistration: {
        questSystem: !!window.questSystem,
        questManager: !!window.questManager,
        questUI: !!window.questUI,
        questIcon: !!window.questIcon
      },
      manager: {
        exists: !!this.manager,
        isReady: this.manager?.isReady?.() || false
      },
      icon: {
        exists: !!this.icon,
        hasElement: !!this.icon?.iconElement,
        inDOM: this.icon?.iconElement ? document.contains(this.icon.iconElement) : false
      },
      ui: {
        exists: !!this.ui,
        hasElements: !!(this.ui?.overlayElement && this.ui?.trackerElement)
      }
    };
  }
  
  destroy() {
    console.log('🧹 [QuestModule] Destruction...');
    
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
      this.healthCheck = null;
    }
    
    // Nettoyer composants
    if (this.icon) {
      this.icon.destroy?.();
      this.icon = null;
    }
    
    if (this.ui) {
      this.ui.destroy?.();
      this.ui = null;
    }
    
    if (this.manager) {
      this.manager.destroy?.();
      this.manager = null;
    }
    
    // Nettoyer enregistrement global
    if (window.questSystem === this) {
      window.questSystem = null;
      window.questSystemGlobal = null;
      window.questModule = null;
      window.questManager = null;
      window.questUI = null;
      window.questIcon = null;
      
      delete window.getQuestSystem;
      delete window.getQuestManager;
      delete window.getQuestUI;
      delete window.getQuestIcon;
      delete window.toggleQuest;
      delete window.openQuest;
      delete window.closeQuest;
      delete window.startQuest;
      delete window.getActiveQuests;
      delete window.triggerQuestProgress;
      delete window.getQuestSystemHealth;
      delete window.repairQuestSystem;
      delete window.debugQuestSystem;
    }
    
    this.networkManager = null;
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

// ✅ FONCTIONS D'INITIALISATION SIMPLIFIÉES

export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest...');
    
    const questOptions = {
      singleton: true,
      autoRepair: true,
      ...options
    };
    
    const questInstance = await createModule(QuestModule, 'quest', gameRoom, scene, questOptions);
    
    console.log('✅ [QuestFactory] Module créé et enregistré globalement');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

// ✅ FONCTION DE BOOT ULTRA-SIMPLIFIÉE
export async function initializeQuestSystemGlobal(gameRoom, options = {}) {
  console.log('🚀 [QuestSystemBoot] === INITIALISATION GLOBALE SIMPLIFIÉE ===');
  
  try {
    // Validation prérequis
    if (!gameRoom) {
      throw new Error('GameRoom requise');
    }
    
    // Nettoyage
    if (window.questSystem) {
      try {
        window.questSystem.destroy?.();
      } catch (error) {
        console.warn('⚠️ [QuestSystemBoot] Erreur destruction ancienne instance');
      }
    }
    
    // Création
    const questModule = await createQuestModule(gameRoom, null, options);
    
    // Connexion NetworkManager si disponible
    if (window.globalNetworkManager) {
      questModule.setNetworkManager(window.globalNetworkManager);
    }
    
    console.log('✅ [QuestSystemBoot] === INITIALISATION RÉUSSIE ===');
    console.log('🎮 [QuestSystemBoot] Quest System accessible via:');
    console.log('   - window.questSystem');
    console.log('   - window.questManager');
    console.log('   - window.toggleQuest()');
    console.log('   - window.startQuest(id)');
    
    return questModule;
    
  } catch (error) {
    console.error('❌ [QuestSystemBoot] Erreur initialisation:', error);
    throw error;
  }
}

// ✅ BOOT AUTOMATIQUE
export async function quickBootQuestSystem() {
  console.log('⚡ [QuestSystemBoot] Boot automatique...');
  
  try {
    const gameRoom = window.currentGameRoom || window.globalNetworkManager?.room;
    
    if (!gameRoom) {
      throw new Error('GameRoom non trouvée');
    }
    
    return await initializeQuestSystemGlobal(gameRoom);
    
  } catch (error) {
    console.error('❌ [QuestSystemBoot] Erreur boot automatique:', error);
    throw error;
  }
}

// ✅ CONFIGURATION UIMANAGER
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
    description: 'Système de quêtes avec enregistrement global',
    version: '3.1.0',
    category: 'Quest Management'
  }
});

export async function registerQuestModule(uiManager) {
  try {
    console.log('📝 [QuestIntegration] Enregistrement UIManager...');
    
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
    console.log('🚀 [QuestIntegration] Initialisation UIManager...');
    
    await registerQuestModule(uiManager);
    
    let questInstance = QuestModule.getInstance('quest');
    
    if (!questInstance || !questInstance.initialized) {
      questInstance = await uiManager.initializeModule('quest');
    }
    
    // Force enregistrement global après initialisation UIManager
    if (questInstance && questInstance.forceGlobalRegistration) {
      questInstance.forceGlobalRegistration();
    }
    
    console.log('✅ [QuestIntegration] Terminé avec enregistrement global');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur:', error);
    throw error;
  }
}

export default QuestModule;

console.log(`
📖 === QUEST SYSTEM - ENREGISTREMENT GLOBAL SIMPLIFIÉ ===

🎯 OBJECTIF: Accès facile pour InteractionManager

✅ ENREGISTREMENT AUTOMATIQUE:
• window.questSystem = QuestModule
• window.questManager = QuestManager  
• window.questUI = QuestUI
• window.questIcon = QuestIcon

🔗 FONCTIONS GLOBALES:
• window.getQuestSystem()
• window.getQuestManager()
• window.toggleQuest()
• window.startQuest(id)
• window.debugQuestSystem()

⚡ USAGE BOOT:
import { quickBootQuestSystem } from './Quest/index.js';
await quickBootQuestSystem();

🎮 INTERACTION MANAGER:
Peut maintenant accéder via:
- window.questSystem.handleNpcInteraction(data)
- window.questManager.handleNpcInteraction(data)
- window.getQuestManager().handleNpcInteraction(data)

✅ ENREGISTREMENT GLOBAL GARANTI !
`);
