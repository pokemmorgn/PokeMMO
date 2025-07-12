// Quest/index.js - QuestModule CORRIGÉ pour affichage icône et tracker
// 🎯 CORRECTIONS: Initialisation UI + Positionnement icône + Tracker visible

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
    console.log('📖 [QuestModule] Instance créée avec BaseModule');
  }
  
  // === 🎯 INITIALISATION CORRIGÉE ===
  
  async init() {
    console.log('🚀 [QuestModule] Initialisation métier Quest...');
    
    this.manager = new QuestManager(this.gameRoom);
    await this.manager.init();
    
    console.log('✅ [QuestModule] Manager Quest initialisé');
  }
  
createComponents() {
  console.log('🔧 [QuestModule] Création composants Quest...');
  
  // Créer l'icône
  if (!this.icon) {
    this.icon = new QuestIcon(this.manager);
    this.icon.init();
    
    // ✅ FORCE POSITIONNEMENT INITIAL pour éviter invisibilité
    if (this.icon.iconElement) {
      this.icon.iconElement.style.position = 'fixed';
      this.icon.iconElement.style.right = '20px';
      this.icon.iconElement.style.bottom = '20px';
      this.icon.iconElement.style.zIndex = '500';
      this.icon.iconElement.style.display = 'block';
      this.icon.iconElement.style.visibility = 'visible';
      this.icon.iconElement.style.opacity = '1';
      console.log('📍 [QuestModule] Position initiale forcée pour icône');
    }
  }
  
  // ✅ CORRECTION: Initialiser UI immédiatement ET attendre qu'elle soit prête
  if (!this.ui) {
    this.ui = new QuestUI(this.manager, this.gameRoom);
    
    // ✅ APPELER init() immédiatement (était manquant)
    this.ui.init().then(() => {
      console.log('✅ [QuestModule] UI Quest initialisée');
      
      // ✅ AFFICHER TRACKER par défaut
      if (this.ui.showTracker) {
        this.ui.showTracker();
        console.log('👁️ [QuestModule] Tracker affiché par défaut');
      }
    }).catch(error => {
      console.error('❌ [QuestModule] Erreur init UI:', error);
    });
  }
  
  console.log('✅ [QuestModule] Composants Quest créés avec init UI');
}
  
  // ✅ CORRECTION 4: Assurer connexions robustes
  connectComponents() {
    console.log('🔗 [QuestModule] Connexion composants Quest...');
    
    // Attendre que UI soit prête
    const ensureUIReady = () => {
      if (this.ui && this.ui.overlayElement && this.ui.trackerElement) {
        this.connectComponentsWhenReady();
      } else {
        console.log('⏳ [QuestModule] UI pas encore prête, retry...');
        setTimeout(ensureUIReady, 100);
      }
    };
    
    ensureUIReady();
  }
  
  connectComponentsWhenReady() {
    console.log('🔗 [QuestModule] Connexion composants (UI prête)...');
    
    // Icône → Interface
    if (this.icon) {
      this.icon.onClick = () => {
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    // Manager → Icône
    if (this.manager) {
      this.manager.onStatsUpdate = (stats) => {
        if (this.icon) {
          this.icon.updateStats(stats);
        }
      };
      
      // Manager → Interface
      this.manager.onQuestUpdate = (quests) => {
        if (this.ui) {
          this.ui.updateQuestData(quests, 'active');
          
          // Force refresh si UI visible
          if (this.ui.isVisible) {
            setTimeout(() => {
              this.ui.refreshQuestList?.();
              this.ui.updateTracker?.();
            }, 100);
          }
        }
      };
      
      // Événements quêtes
      this.manager.onQuestStarted = (quest) => {
        if (this.icon) this.icon.animateNewQuest();
        
        if (typeof window.showGameNotification === 'function') {
          window.showGameNotification(
            `Nouvelle quête: ${quest.name || 'Quête sans nom'}`,
            'success',
            { duration: 3000 }
          );
        }
      };
      
      this.manager.onQuestCompleted = (quest) => {
        if (this.icon) this.icon.animateQuestCompleted();
        
        if (typeof window.showGameNotification === 'function') {
          window.showGameNotification('Quête terminée !', 'success', { duration: 3000 });
        }
      };
      
      this.manager.onQuestProgress = (progress) => {
        if (this.icon) this.icon.animateQuestProgress();
      };
    }
    
    // Interface → Manager
    if (this.ui) {
      this.ui.onAction = (action, data) => {
        if (this.manager) {
          this.manager.handleAction(action, data);
        }
      };
    }
    
    console.log('✅ [QuestModule] Composants Quest connectés');
  }
  
  // ✅ CORRECTION 5: createIcon robuste pour UIManager
  async createIcon() {
    console.log('🎨 [QuestModule] Création icône pour UIManager...');
    
    // S'assurer que les composants existent
    if (!this.icon) {
      this.createComponents();
      
      // Attendre que l'icône soit prête
      let retries = 0;
      while (!this.icon.iconElement && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
    }
    
    if (this.icon && this.icon.iconElement) {
      console.log('✅ [QuestModule] Icône disponible pour UIManager');
      
      // ✅ FORCE AFFICHAGE avant UIManager
      this.icon.iconElement.style.display = 'block';
      this.icon.iconElement.style.visibility = 'visible';
      this.icon.iconElement.style.opacity = '1';
      
      return this.icon.iconElement;
    }
    
    console.warn('❌ [QuestModule] Impossible de créer l\'icône');
    return null;
  }
  
  // ✅ CORRECTION 6: Show avec demande données + tracker
  show() {
    const result = super.show();
    
    // ✅ Afficher tracker immédiatement
    if (this.ui && this.ui.showTracker) {
      this.ui.showTracker();
      console.log('👁️ [QuestModule] Tracker affiché via show()');
    }
    
    // Demander données
    if (this.manager) {
      setTimeout(() => {
        this.manager.requestQuestData();
      }, 200);
    }
    
    return result;
  }
  
  // ✅ CORRECTION 7: Force affichage tracker
  ensureTrackerVisible() {
    console.log('🔍 [QuestModule] Assurer visibilité tracker...');
    
    if (!this.ui || !this.ui.trackerElement) {
      console.warn('⚠️ [QuestModule] Tracker element non trouvé');
      return false;
    }
    
    const tracker = this.ui.trackerElement;
    
    // Force affichage
    tracker.style.display = 'block';
    tracker.style.visibility = 'visible';
    tracker.style.opacity = '1';
    tracker.style.pointerEvents = 'auto';
    tracker.classList.remove('hidden');
    
    // Position fixe si pas définie
    if (!tracker.style.position || tracker.style.position === 'static') {
      tracker.style.position = 'fixed';
      tracker.style.top = '120px';
      tracker.style.right = '20px';
      tracker.style.zIndex = '950';
    }
    
    console.log('✅ [QuestModule] Tracker forcé visible');
    return true;
  }
  
  // ✅ CORRECTION 8: Méthodes tracker publiques
  showTracker() {
    if (this.ui) {
      this.ui.showTracker();
      this.ensureTrackerVisible();
    }
  }
  
  hideTracker() {
    if (this.ui) {
      this.ui.hideTracker();
    }
  }
  
  toggleTracker() {
    if (this.ui) {
      this.ui.toggleTracker();
    }
  }
  
  // === MÉTHODES QUEST EXISTANTES (inchangées) ===
  
  getActiveQuests() {
    return this.manager ? this.manager.getActiveQuests() : [];
  }
  
  getQuestStats() {
    return this.manager ? this.manager.getQuestStats() : null;
  }
  
  hasActiveQuests() {
    return this.manager ? this.manager.hasActiveQuests() : false;
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
  
  showQuestDialog(title, quests, onSelectQuest) {
    if (this.ui) {
      this.ui.showQuestDialog(title, quests, onSelectQuest);
    }
  }
  
  // API legacy
  toggleQuestJournal() { this.toggleUI(); }
  openQuestJournal() { this.open(); }
  closeQuestJournal() { this.close(); }
  openQuest() { this.open(); }
  closeQuest() { this.close(); }
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    return {
      ...baseState,
      questCount: this.manager ? this.manager.getQuestCount() : 0,
      hasActiveQuests: this.manager ? this.manager.hasActiveQuests() : false,
      trackerVisible: this.ui ? this.ui.isTrackerVisible : false,
      moduleType: 'quest'
    };
  }
}

// === FACTORY CORRIGÉE ===

export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest CORRIGÉ...');
    
    const questOptions = {
      singleton: true,
      ...options
    };
    
    const questInstance = await createModule(QuestModule, 'quest', gameRoom, scene, questOptions);
    
    // ✅ FORCE AFFICHAGE TRACKER après création
    setTimeout(() => {
      if (questInstance.ensureTrackerVisible) {
        questInstance.ensureTrackerVisible();
      }
    }, 500);
    
    console.log('✅ [QuestFactory] Module Quest créé avec tracker visible');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création module Quest:', error);
    throw error;
  }
}

// === SETUP SYSTÈME QUEST CORRIGÉ ===

export async function setupQuestSystem(uiManager) {
  try {
    console.log('🔧 [QuestSetup] Configuration système Quest CORRIGÉ...');
    
    const questInstance = await initializeQuestModule(uiManager);
    
    // Exposer globalement
    if (!window.questSystem) {
      window.questSystem = questInstance;
      window.questSystemGlobal = questInstance;
      
      // Fonctions génériques
      window.toggleQuest = () => questInstance.toggleUI();
      window.openQuest = () => questInstance.open();
      window.closeQuest = () => questInstance.close();
      window.forceCloseQuest = () => questInstance.forceCloseUI();
      
      // Fonctions spécifiques Quest
      window.toggleQuestJournal = () => questInstance.toggleUI();
      window.openQuestJournal = () => questInstance.open();
      window.closeQuestJournal = () => questInstance.close();
      
      // ✅ FONCTIONS TRACKER NOUVELLES
      window.toggleQuestTracker = () => questInstance.toggleTracker();
      window.showQuestTracker = () => questInstance.showTracker();
      window.hideQuestTracker = () => questInstance.hideTracker();
      window.ensureQuestTrackerVisible = () => questInstance.ensureTrackerVisible();
      
      // API progression
      window.triggerQuestProgress = (type, data) => questInstance.triggerProgress(type, data);
      window.startQuest = (questId) => questInstance.startQuest(questId);
      window.showQuestDialog = (title, quests, callback) => questInstance.showQuestDialog(title, quests, callback);
      
      console.log('🌐 [QuestSetup] Fonctions globales Quest exposées avec tracker');
    }
    
    // ✅ FORCE AFFICHAGE INITIAL
    setTimeout(() => {
      if (questInstance.show) {
        questInstance.show();
      }
      
      if (questInstance.ensureTrackerVisible) {
        questInstance.ensureTrackerVisible();
      }
      
      console.log('✅ [QuestSetup] Affichage initial forcé');
    }, 1000);
    
    console.log('✅ [QuestSetup] Système Quest configuré CORRIGÉ');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestSetup] Erreur configuration:', error);
    throw error;
  }
}

// === FONCTION DE RÉPARATION ===

export function fixQuestDisplay() {
  console.log('🔧 [QuestFix] Réparation affichage Quest...');
  
  try {
    const instance = QuestModule.getInstance('quest');
    
    if (!instance) {
      console.error('❌ [QuestFix] Aucune instance Quest trouvée');
      return false;
    }
    
    // 1. Force affichage icône
    if (instance.icon && instance.icon.iconElement) {
      const icon = instance.icon.iconElement;
      icon.style.display = 'block';
      icon.style.visibility = 'visible';
      icon.style.opacity = '1';
      icon.style.position = 'fixed';
      icon.style.right = '20px';
      icon.style.bottom = '20px';
      icon.style.zIndex = '500';
      
      console.log('✅ [QuestFix] Icône Quest réparée');
    }
    
    // 2. Force affichage tracker
    if (instance.ensureTrackerVisible) {
      instance.ensureTrackerVisible();
    } else if (instance.ui && instance.ui.trackerElement) {
      const tracker = instance.ui.trackerElement;
      tracker.style.display = 'block';
      tracker.style.visibility = 'visible';
      tracker.style.opacity = '1';
      tracker.style.position = 'fixed';
      tracker.style.top = '120px';
      tracker.style.right = '20px';
      tracker.style.zIndex = '950';
      tracker.classList.remove('hidden');
      
      console.log('✅ [QuestFix] Tracker Quest réparé');
    }
    
    // 3. Demander données
    if (instance.manager && instance.manager.requestQuestData) {
      instance.manager.requestQuestData();
    }
    
    console.log('✅ [QuestFix] Réparation Quest terminée');
    return true;
    
  } catch (error) {
    console.error('❌ [QuestFix] Erreur réparation:', error);
    return false;
  }
}

// Configuration export (existant)
export const QUEST_MODULE_CONFIG = generateModuleConfig('quest', {
  moduleClass: QuestModule,
  order: 1,
  options: {
    singleton: true,
    keyboardShortcut: 'l'
  },
  groups: ['ui-icons', 'quest-management'],
  metadata: {
    name: 'Quest Journal',
    description: 'Complete quest management system with journal and tracker',
    version: '2.1.0',
    category: 'Quest Management'
  },
  factory: () => createQuestModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

export async function registerQuestModule(uiManager) {
  try {
    console.log('📝 [QuestIntegration] Enregistrement Quest...');
    
    if (uiManager.modules && uiManager.modules.has('quest')) {
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
    console.log('🚀 [QuestIntegration] Initialisation Quest...');
    
    await registerQuestModule(uiManager);
    
    let questInstance = QuestModule.getInstance('quest');
    
    if (!questInstance || !questInstance.uiManagerState.initialized) {
      questInstance = await uiManager.initializeModule('quest');
    } else {
      console.log('ℹ️ [QuestIntegration] Instance déjà initialisée');
      questInstance.connectUIManager(uiManager);
    }
    
    setupQuestGlobalEvents(questInstance);
    
    console.log('✅ [QuestIntegration] Initialisation Quest terminée');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// Événements globaux (simplifié)
function setupQuestGlobalEvents(questInstance) {
  if (window._questEventsSetup) return;
  
  window.addEventListener('itemCollected', (event) => {
    if (questInstance.manager) {
      const { itemId, amount } = event.detail;
      questInstance.triggerProgress('collect', { itemId, amount });
    }
  });
  
  window.addEventListener('battleStarted', () => {
    if (questInstance.ui && questInstance.ui.isVisible) {
      questInstance.ui.hide();
    }
    if (questInstance.ui && questInstance.ui.isTrackerVisible) {
      questInstance.ui.hideTracker();
    }
  });
  
  window.addEventListener('battleEnded', () => {
    if (questInstance.ui) {
      questInstance.ui.showTracker();
    }
  });
  
  window._questEventsSetup = true;
  console.log('🌐 [QuestEvents] Événements Quest configurés');
}

export default QuestModule;

console.log(`
📖 === QUEST MODULE CORRIGÉ ===

✅ CORRECTIONS APPLIQUÉES:
1. this.ui.init() appelé dans createComponents()
2. Position initiale forcée pour icône (éviter invisibilité)
3. Tracker affiché par défaut via showTracker()
4. createIcon() robuste avec retry
5. ensureTrackerVisible() pour force affichage
6. show() affiche tracker immédiatement
7. Méthodes tracker publiques
8. Fonction fixQuestDisplay() pour réparation

🎯 NOUVELLES FONCTIONS:
• ensureTrackerVisible() - Force affichage tracker
• showTracker()/hideTracker()/toggleTracker() - Contrôle tracker
• fixQuestDisplay() - Réparation complète
• window.ensureQuestTrackerVisible() - Global

📍 FLUX CORRIGÉ:
1. createComponents() → init UI immédiatement
2. createIcon() → force position initiale
3. show() → affiche tracker automatiquement
4. connectComponents() → connexions quand UI prête

🚀 UTILISATION:
• setupQuestSystem(uiManager) - Setup complet
• fixQuestDisplay() - Réparation
• window.ensureQuestTrackerVisible() - Force tracker

✅ QUEST ICÔNE + TRACKER MAINTENANT VISIBLES !
`);
