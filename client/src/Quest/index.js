// Quest/index.js - FIX SINGLETON STRICT

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { QuestManager } from './QuestManager.js';
import { QuestIcon } from './QuestIcon.js';
import { QuestUI } from './QuestUI.js';

// ✅ NOUVEAU: Stockage strict des instances
const QUEST_INSTANCES = new Map();

export class QuestModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // ✅ NOUVEAU: Vérifier si instance existe déjà
    const instanceId = moduleId || 'quest';
    
    if (QUEST_INSTANCES.has(instanceId)) {
      console.log(`ℹ️ [QuestModule] Instance ${instanceId} existe déjà, réutilisation`);
      return QUEST_INSTANCES.get(instanceId);
    }
    
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
    
    super(instanceId, gameRoom, scene, questOptions);
    
    // ✅ NOUVEAU: Stocker l'instance immédiatement
    QUEST_INSTANCES.set(instanceId, this);
    
    this.initialized = false;
    this.componentsReady = false;
    this.networkManager = null;
    this.instanceId = instanceId;
    
    // Contrôle boucle vérification
    this.verificationAttempts = 0;
    this.maxVerificationAttempts = 3;
    this.verificationInProgress = false;
    
    // ✅ NOUVEAU: Flag pour éviter double init
    this.initializationInProgress = false;
    
    console.log(`📖 [QuestModule] Instance créée: ${instanceId}`);
  }
  
  async init() {
    // ✅ NOUVEAU: Éviter double initialisation
    if (this.initializationInProgress) {
      console.log(`⏳ [QuestModule] Initialisation déjà en cours pour ${this.instanceId}`);
      return this;
    }
    
    if (this.initialized) {
      console.log(`ℹ️ [QuestModule] Déjà initialisé: ${this.instanceId}`);
      return this;
    }
    
    try {
      this.initializationInProgress = true;
      console.log(`🚀 [QuestModule] Initialisation ${this.instanceId}...`);
      
      await this.validateDependencies();
      await this.initializeManager();
      await this.createComponents();
      await this.waitForComponentsReady();
      this.connectComponents();
      
      this.initialized = true;
      this.initializationInProgress = false;
      
      console.log(`✅ [QuestModule] Initialisation terminée: ${this.instanceId}`);
      return this;
      
    } catch (error) {
      this.initializationInProgress = false;
      console.error(`❌ [QuestModule] Erreur initialisation ${this.instanceId}:`, error);
      await this.attemptRecovery();
      throw error;
    }
  }
  
  async validateDependencies() {
    console.log(`🔍 [QuestModule] Validation dépendances ${this.instanceId}...`);
    
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
    
    console.log(`✅ [QuestModule] Dépendances validées: ${this.instanceId}`);
  }
  
  async initializeManager() {
    console.log(`🎯 [QuestModule] Initialisation manager ${this.instanceId}...`);
    
    // ✅ NOUVEAU: Ne pas recréer si existe déjà
    if (this.manager && this.manager.initialized) {
      console.log(`ℹ️ [QuestModule] Manager déjà initialisé: ${this.instanceId}`);
      return;
    }
    
    this.manager = new QuestManager(this.gameRoom);
    
    // Connecter NetworkManager si disponible
    if (this.networkManager) {
      await this.manager.init(this.gameRoom, this.networkManager);
    } else if (window.globalNetworkManager) {
      this.networkManager = window.globalNetworkManager;
      await this.manager.init(this.gameRoom, this.networkManager);
    } else {
      await this.manager.init(this.gameRoom);
    }
    
    // Vérification handlers avec limite
    this.scheduleHandlerVerification();
    
    console.log(`✅ [QuestModule] Manager initialisé: ${this.instanceId}`);
  }
  
  async createComponents() {
    console.log(`🔧 [QuestModule] Création composants ${this.instanceId}...`);
    
    // ✅ NOUVEAU: Vérifier si composants existent déjà
    if (this.componentsReady) {
      console.log(`ℹ️ [QuestModule] Composants déjà prêts: ${this.instanceId}`);
      return;
    }
    
    await this.createComponentsSequential();
    console.log(`✅ [QuestModule] Composants créés: ${this.instanceId}`);
  }
  
  async createComponentsSequential() {
    console.log(`🔧 [QuestModule] Création composants séquentielle ${this.instanceId}...`);
    
    await this.createIconComponent();
    await this.createUIComponent();
    await this.waitForComponentsReady();
    
    this.componentsReady = true;
    console.log(`✅ [QuestModule] Composants séquentiels créés: ${this.instanceId}`);
  }
  
  async createIconComponent() {
    console.log(`🎨 [QuestModule] Création icône ${this.instanceId}...`);
    
    // ✅ NOUVEAU: Ne pas recréer si existe
    if (this.icon && this.icon.iconElement) {
      console.log(`ℹ️ [QuestModule] Icône existe déjà: ${this.instanceId}`);
      return;
    }
    
    this.icon = new QuestIcon(this.manager);
    await this.icon.init();
    this.forceIconDisplay();
    
    console.log(`✅ [QuestModule] Icône créée: ${this.instanceId}`);
  }
  
  async createUIComponent() {
    console.log(`📱 [QuestModule] Création interface ${this.instanceId}...`);
    
    // ✅ NOUVEAU: Ne pas recréer si existe
    if (this.ui && this.ui.overlayElement) {
      console.log(`ℹ️ [QuestModule] Interface existe déjà: ${this.instanceId}`);
      return;
    }
    
    this.ui = new QuestUI(this.manager, this.gameRoom);
    await this.ui.init();
    
    if (this.ui.showTracker) {
      this.ui.showTracker();
    }
    
    console.log(`✅ [QuestModule] Interface créée: ${this.instanceId}`);
  }
  
  // ✅ NOUVEAU: Méthode pour nettoyer les instances
  static clearInstances() {
    console.log('🧹 [QuestModule] Nettoyage de toutes les instances');
    
    QUEST_INSTANCES.forEach((instance, id) => {
      try {
        instance.destroy();
      } catch (error) {
        console.error(`❌ [QuestModule] Erreur destruction ${id}:`, error);
      }
    });
    
    QUEST_INSTANCES.clear();
    console.log('✅ [QuestModule] Toutes les instances nettoyées');
  }
  
  // ✅ NOUVEAU: Méthode pour obtenir instance
  static getInstance(instanceId = 'quest') {
    return QUEST_INSTANCES.get(instanceId) || null;
  }
  
  // ✅ NOUVEAU: Méthode pour vérifier instances
  static getInstanceCount() {
    return QUEST_INSTANCES.size;
  }
  
  // ✅ NOUVEAU: Méthode pour lister instances
  static listInstances() {
    const instances = {};
    QUEST_INSTANCES.forEach((instance, id) => {
      instances[id] = {
        initialized: instance.initialized,
        componentsReady: instance.componentsReady,
        hasManager: !!instance.manager,
        hasIcon: !!instance.icon,
        hasUI: !!instance.ui
      };
    });
    return instances;
  }
  
  destroy() {
    console.log(`🧹 [QuestModule] Destruction ${this.instanceId}...`);
    
    this.resetComponents();
    
    if (this.manager) {
      this.manager.destroy?.();
      this.manager = null;
    }
    
    this.networkManager = null;
    this.initialized = false;
    this.initializationInProgress = false;
    
    // ✅ NOUVEAU: Supprimer de la Map
    QUEST_INSTANCES.delete(this.instanceId);
    
    console.log(`✅ [QuestModule] Détruit: ${this.instanceId}`);
  }
  
  // ... le reste des méthodes reste identique ...
  
  scheduleHandlerVerification() {
    console.log(`🔍 [QuestModule] Programmation vérification handlers ${this.instanceId}...`);
    
    // Vérification immédiate
    setTimeout(() => {
      this.verifyHandlersRegistered();
    }, 1000);
    
    // Vérification de backup
    setTimeout(() => {
      this.verifyHandlersRegistered();
    }, 3000);
  }
  
  verifyHandlersRegistered() {
    if (this.verificationInProgress) {
      console.log(`🔄 [QuestModule] Vérification déjà en cours, ignorer ${this.instanceId}...`);
      return;
    }
    
    if (this.verificationAttempts >= this.maxVerificationAttempts) {
      console.log(`⚠️ [QuestModule] Limite de vérifications atteinte ${this.instanceId}, arrêt`);
      return;
    }
    
    this.verificationInProgress = true;
    this.verificationAttempts++;
    
    console.log(`🔍 [QuestModule] Vérification handlers ${this.instanceId} (${this.verificationAttempts}/${this.maxVerificationAttempts})...`);
    
    if (!this.manager || !this.manager.gameRoom) {
      console.warn(`⚠️ [QuestModule] Manager ou GameRoom manquant ${this.instanceId}`);
      this.verificationInProgress = false;
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
      console.warn(`⚠️ [QuestModule] Handlers manquants ${this.instanceId}: ${missingHandlers.join(', ')}`);
      console.log(`🔧 [QuestModule] Auto-réparation ${this.instanceId}...`);
      
      // Force re-registration
      if (this.manager.registerHandlers) {
        this.manager.registerHandlers();
      }
      
      if (this.verificationAttempts < this.maxVerificationAttempts) {
        setTimeout(() => {
          this.verificationInProgress = false;
          this.verifyHandlersRegistered();
        }, 2000);
      } else {
        console.warn(`⚠️ [QuestModule] Limite atteinte ${this.instanceId}, handlers peuvent être manquants`);
        this.verificationInProgress = false;
      }
    } else {
      console.log(`✅ [QuestModule] Tous les handlers sont enregistrés ${this.instanceId}`);
      this.verificationInProgress = false;
    }
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
      
      console.log(`🔧 [QuestModule] Affichage icône forcé ${this.instanceId}`);
    }
  }
  
  async waitForComponentsReady() {
    console.log(`⏳ [QuestModule] Attente composants ${this.instanceId}...`);
    
    const maxWait = 5000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const iconReady = !!(this.icon?.iconElement);
      const uiReady = !!(this.ui?.overlayElement && this.ui?.trackerElement);
      
      if (iconReady && uiReady) {
        console.log(`✅ [QuestModule] Composants prêts ${this.instanceId}`);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn(`⚠️ [QuestModule] Timeout composants ${this.instanceId}`);
    return false;
  }
  
  connectComponents() {
    console.log(`🔗 [QuestModule] Connexion composants ${this.instanceId}...`);
    
    this.connectManagerToIcon();
    this.connectIconToUI();
    this.connectManagerToUI();
    this.connectUIToManager();
    
    console.log(`✅ [QuestModule] Composants connectés ${this.instanceId}`);
  }
  
  connectManagerToIcon() {
    if (this.manager && this.icon) {
      this.manager.onStatsUpdate = (stats) => {
        try {
          this.icon.updateStats(stats);
        } catch (error) {
          console.error(`❌ [QuestModule] Erreur manager→icon ${this.instanceId}:`, error);
        }
      };
      
      this.manager.onQuestStarted = (quest) => {
        try {
          if (this.icon) this.icon.animateNewQuest();
          this.showNotification(`Nouvelle quête: ${quest.name || 'Quête sans nom'}`, 'success');
        } catch (error) {
          console.error(`❌ [QuestModule] Erreur onQuestStarted ${this.instanceId}:`, error);
        }
      };
      
      this.manager.onQuestCompleted = (quest) => {
        try {
          if (this.icon) this.icon.animateQuestCompleted();
          this.showNotification('Quête terminée !', 'success');
        } catch (error) {
          console.error(`❌ [QuestModule] Erreur onQuestCompleted ${this.instanceId}:`, error);
        }
      };
      
      this.manager.onQuestProgress = (progress) => {
        try {
          if (this.icon) this.icon.animateQuestProgress();
        } catch (error) {
          console.error(`❌ [QuestModule] Erreur onQuestProgress ${this.instanceId}:`, error);
        }
      };
      
      console.log(`🔗 [QuestModule] Manager→Icône connecté ${this.instanceId}`);
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
          console.error(`❌ [QuestModule] Erreur icône→UI ${this.instanceId}:`, error);
        }
      };
      
      console.log(`🔗 [QuestModule] Icône→UI connecté ${this.instanceId}`);
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
          console.error(`❌ [QuestModule] Erreur manager→UI ${this.instanceId}:`, error);
        }
      };
      
      console.log(`🔗 [QuestModule] Manager→UI connecté ${this.instanceId}`);
    }
  }
  
  connectUIToManager() {
    if (this.ui && this.manager) {
      this.ui.onAction = (action, data) => {
        try {
          this.manager.handleAction(action, data);
        } catch (error) {
          console.error(`❌ [QuestModule] Erreur UI→manager ${this.instanceId}:`, error);
        }
      };
      
      console.log(`🔗 [QuestModule] UI→Manager connecté ${this.instanceId}`);
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
    this.verificationAttempts = 0;
    this.verificationInProgress = false;
  }
  
  showNotification(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, { duration: 3000 });
    } else {
      console.log(`📢 [QuestModule] ${this.instanceId} ${type.toUpperCase()}: ${message}`);
    }
  }
  
  canOpenUI() {
    return this.isEnabled && this.initialized && !!this.ui;
  }
  
  showCannotOpenMessage() {
    this.showNotification('Quest journal not available', 'warning');
  }
  
  async createIcon() {
    console.log(`🎨 [QuestModule] createIcon() pour UIManager ${this.instanceId}`);
    
    if (!this.icon?.iconElement) {
      await this.createIconComponent();
    }
    
    if (this.icon?.iconElement) {
      this.forceIconDisplay();
      return this.icon.iconElement;
    }
    
    console.error(`❌ [QuestModule] Impossible de créer icône ${this.instanceId}`);
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
  
  getSystemHealth() {
    return {
      instanceId: this.instanceId,
      initialized: this.initialized,
      initializationInProgress: this.initializationInProgress,
      componentsReady: this.componentsReady,
      verificationAttempts: this.verificationAttempts,
      verificationInProgress: this.verificationInProgress,
      hasNetworkManager: !!this.networkManager,
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
  
  setNetworkManager(networkManager) {
    console.log(`🔗 [QuestModule] Configuration NetworkManager ${this.instanceId}...`);
    
    this.networkManager = networkManager;
    
    if (this.manager) {
      this.manager.connectNetworkManager(networkManager);
    }
    
    console.log(`✅ [QuestModule] NetworkManager configuré ${this.instanceId}`);
  }
  
  attemptRecovery() {
    console.log(`🔄 [QuestModule] Récupération ${this.instanceId}...`);
    
    try {
      this.resetComponents();
      
      if (this.gameRoom) {
        this.manager = new QuestManager(this.gameRoom);
        this.manager.init(this.gameRoom, this.networkManager);
        this.createMinimalInterface();
      }
      
      console.log(`✅ [QuestModule] Récupération partielle ${this.instanceId}`);
      
    } catch (error) {
      console.error(`❌ [QuestModule] Récupération échouée ${this.instanceId}:`, error);
    }
  }
  
  createMinimalInterface() {
    this.icon = new QuestIcon(this.manager);
    this.icon.init();
    this.forceIconDisplay();
    
    this.icon.onClick = () => {
      this.showNotification('Quest system en mode récupération', 'warning');
    };
  }
}

// === FACTORY AVEC SINGLETON STRICT ===

export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest...');
    
    // ✅ NOUVEAU: Vérifier si instance existe déjà
    const existingInstance = QuestModule.getInstance('quest');
    if (existingInstance && existingInstance.initialized) {
      console.log('ℹ️ [QuestFactory] Instance existante trouvée, réutilisation');
      return existingInstance;
    }
    
    // ✅ NOUVEAU: Nettoyer les anciennes instances si nécessaire
    if (QuestModule.getInstanceCount() > 0) {
      console.log('🧹 [QuestFactory] Nettoyage instances existantes...');
      QuestModule.clearInstances();
    }
    
    const questOptions = {
      singleton: true,
      autoRepair: true,
      ...options
    };
    
    const questInstance = new QuestModule('quest', gameRoom, scene, questOptions);
    await questInstance.init();
    
    console.log('✅ [QuestFactory] Module créé');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création:', error);
    throw error;
  }
}

// === FONCTIONS DEBUG ===

// Debug function to check instances
window.debugQuestInstances = () => {
  console.log('🔍 [QuestDebug] Instances:', QuestModule.listInstances());
  console.log('🔍 [QuestDebug] Count:', QuestModule.getInstanceCount());
  
  return {
    instances: QuestModule.listInstances(),
    count: QuestModule.getInstanceCount()
  };
};

// Force clean all instances
window.cleanQuestInstances = () => {
  QuestModule.clearInstances();
  console.log('✅ [QuestDebug] Toutes les instances nettoyées');
};

export default QuestModule;
