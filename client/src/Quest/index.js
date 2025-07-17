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
    this.networkManager = null;
    
    // ✅ NOUVEAU: Contrôle boucle vérification
    this.verificationAttempts = 0;
    this.maxVerificationAttempts = 3;
    this.verificationInProgress = false;
    
    console.log('📖 [QuestModule] Instance créée');
  }
  
  async init() {
    try {
      console.log('🚀 [QuestModule] Initialisation...');
      
      await this.validateDependencies();
      await this.initializeManager();
      this.createComponents();
      await this.waitForComponentsReady();
      this.connectComponents();
      
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
    
    console.log('✅ [QuestModule] Dépendances validées');
  }
  
  async initializeManager() {
    console.log('🎯 [QuestModule] Initialisation manager...');
    
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
    
    // ✅ CORRECTION: Vérification handlers avec limite
    this.scheduleHandlerVerification();
    
    console.log('✅ [QuestModule] Manager initialisé');
  }
  
  // ✅ NOUVELLE MÉTHODE: Vérification avec limite et timeout
  scheduleHandlerVerification() {
    console.log('🔍 [QuestModule] Programmation vérification handlers...');
    
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
    // ✅ CORRECTION: Éviter la boucle infinie
    if (this.verificationInProgress) {
      console.log('🔄 [QuestModule] Vérification déjà en cours, ignorer...');
      return;
    }
    
    if (this.verificationAttempts >= this.maxVerificationAttempts) {
      console.log('⚠️ [QuestModule] Limite de vérifications atteinte, arrêt');
      return;
    }
    
    this.verificationInProgress = true;
    this.verificationAttempts++;
    
    console.log(`🔍 [QuestModule] Vérification handlers (${this.verificationAttempts}/${this.maxVerificationAttempts})...`);
    
    if (!this.manager || !this.manager.gameRoom) {
      console.warn('⚠️ [QuestModule] Manager ou GameRoom manquant');
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
      console.warn(`⚠️ [QuestModule] Handlers manquants: ${missingHandlers.join(', ')}`);
      console.log('🔧 [QuestModule] Auto-réparation...');
      
      // Force re-registration
      if (this.manager.registerHandlers) {
        this.manager.registerHandlers();
      }
      
      // ✅ CORRECTION: Vérifier à nouveau seulement si pas à la limite
      if (this.verificationAttempts < this.maxVerificationAttempts) {
        setTimeout(() => {
          this.verificationInProgress = false;
          this.verifyHandlersRegistered();
        }, 2000);
      } else {
        console.warn('⚠️ [QuestModule] Limite atteinte, handlers peuvent être manquants');
        this.verificationInProgress = false;
      }
    } else {
      console.log('✅ [QuestModule] Tous les handlers sont enregistrés');
      this.verificationInProgress = false;
    }
  }
  
  // Setter NetworkManager
  setNetworkManager(networkManager) {
    console.log('🔗 [QuestModule] Configuration NetworkManager...');
    
    this.networkManager = networkManager;
    
    if (this.manager) {
      this.manager.connectNetworkManager(networkManager);
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
    
    this.connectManagerToIcon();
    this.connectIconToUI();
    this.connectManagerToUI();
    this.connectUIToManager();
    
    console.log('✅ [QuestModule] Composants connectés');
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
    
    // ✅ CORRECTION: Reset des compteurs de vérification
    this.verificationAttempts = 0;
    this.verificationInProgress = false;
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
  
  destroy() {
    console.log('🧹 [QuestModule] Destruction...');
    
    this.resetComponents();
    
    if (this.manager) {
      this.manager.destroy?.();
      this.manager = null;
    }
    
    this.networkManager = null;
    this.initialized = false;
    
    console.log('✅ [QuestModule] Détruit');
  }
  
  // === API PUBLIQUE ===
  
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

// === FACTORY ET UTILITAIRES ===

export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest...');
    
    const questOptions = {
      singleton: true,
      autoRepair: true,
      ...options
    };
    
    const questInstance = await createModule(QuestModule, 'quest', gameRoom, scene, questOptions);
    
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
    
    // Reset des compteurs de vérification
    instance.verificationAttempts = 0;
    instance.verificationInProgress = false;
    
    // Nouvelle vérification
    instance.scheduleHandlerVerification();
    
    console.log('✅ [QuestRepair] Réparation terminée');
    return true;
    
  } catch (error) {
    console.error('❌ [QuestRepair] Erreur:', error);
    return false;
  }
}

// === INITIALISATION GLOBALE ===

export async function initializeQuestSystemGlobal(networkManager, gameRoom, scene = null, uiManager = null) {
  console.log('🚀 [QuestSystemBoot] === INITIALISATION GLOBALE ===');
  
  try {
    // Validation prérequis
    if (!networkManager) {
      throw new Error('NetworkManager requis');
    }
    
    if (!gameRoom) {
      throw new Error('GameRoom requise');
    }
    
    console.log('✅ [QuestSystemBoot] Prérequis validés');
    
    // Nettoyage instance existante
    if (window.questSystem) {
      try {
        window.questSystem.destroy?.();
      } catch (error) {
        console.warn('⚠️ [QuestSystemBoot] Erreur destruction ancienne instance:', error);
      }
    }
    
    // Création QuestModule
    const questOptions = {
      singleton: true,
      autoRepair: true,
      keyboardShortcut: 'l',
      autoCloseUI: true
    };
    
    const questModule = await createQuestModule(gameRoom, scene, questOptions);
    
    // Connexion NetworkManager
    questModule.setNetworkManager(networkManager);
    
    // Connexion UIManager (si disponible)
    if (uiManager) {
      try {
        await registerQuestModule(uiManager);
        questModule.connectUIManager?.(uiManager);
        console.log('✅ [QuestSystemBoot] UIManager connecté');
      } catch (error) {
        console.warn('⚠️ [QuestSystemBoot] Erreur connexion UIManager:', error);
      }
    }
    
    // Exposition globale
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
    
    // Validation finale
    const health = questModule.getSystemHealth();
    
    if (!health.initialized) {
      throw new Error('QuestModule non initialisé correctement');
    }
    
    console.log('✅ [QuestSystemBoot] === INITIALISATION RÉUSSIE ===');
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
    throw error;
  }
}

// === CONFIGURATION MODULE ===

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

export default QuestModule;

console.log(`
📖 === QUEST MODULE - VERSION SANS BOUCLE ===

✅ CORRECTIONS APPORTÉES:
• Ajout de verificationAttempts et maxVerificationAttempts
• Ajout de verificationInProgress pour éviter les appels multiples
• Remplacement de la boucle infinie par une vérification limitée
• Nouveau scheduleHandlerVerification() pour contrôler les vérifications
• Reset des compteurs dans resetComponents() et repairQuestSystem()

🔧 LOGIQUE DE VÉRIFICATION:
• Max 3 tentatives de vérification
• Délai de 2 secondes entre les tentatives  
• Pas de nouvelle vérification si une est en cours
• Arrêt automatique si limite atteinte

⚡ RÉSULTAT:
• Plus de boucle infinie
• Vérification des handlers toujours fonctionnelle
• Dégradation gracieuse si handlers manquants
• Logs informatifs pour debug

✅ QUEST SYSTEM STABILISÉ SANS BOUCLE !
`);
