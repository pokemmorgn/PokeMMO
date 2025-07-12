// Quest/index.js - QuestModule refactorisé avec BaseModule
// 🎯 UTILISE BaseModule pour éviter duplication de code
// 📍 INTÉGRÉ avec UIManager via BaseModule
// 🆕 CODE SIMPLIFIÉ ET MAINTENABLE

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { QuestManager } from './QuestManager.js';
import { QuestIcon } from './QuestIcon.js';
import { QuestUI } from './QuestUI.js';

/**
 * Module Quest utilisant BaseModule
 * Hérite de toute la logique UIManager générique
 */
export class QuestModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Quest
    const questOptions = {
      singleton: true,           // Quest est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 'l',     // Touche L pour ouvrir/fermer (évite conflit avec Q)
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 1,                // Après inventory (0), avant team (2)
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'quest', gameRoom, scene, questOptions);
    
    console.log('📖 [QuestModule] Instance créée avec BaseModule');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Quest
   */
  async init() {
    console.log('🚀 [QuestModule] Initialisation métier Quest...');
    
    // Créer le manager (business logic)
    this.manager = new QuestManager(this.gameRoom);
    await this.manager.init();
    
    console.log('✅ [QuestModule] Manager Quest initialisé');
  }
  
  /**
   * Création des composants Quest
   */
  createComponents() {
    console.log('🔧 [QuestModule] Création composants Quest...');
    
    // Créer l'icône si pas encore fait
    if (!this.icon) {
      this.icon = new QuestIcon(this.manager);
      this.icon.init();
    }
    
    // Créer l'interface si pas encore fait
    if (!this.ui) {
      this.ui = new QuestUI(this.manager, this.gameRoom);
      // Note: L'init de QuestUI est async, on le fait dans connectComponents
    }
    
    console.log('✅ [QuestModule] Composants Quest créés');
  }
  
  /**
   * Connexion des composants Quest
   */
  connectComponents() {
    console.log('🔗 [QuestModule] Connexion composants Quest...');
    
    // Initialiser UI de manière async si nécessaire
    if (this.ui && !this.ui.initialized) {
      this.ui.init().catch(error => {
        console.error('❌ [QuestModule] Erreur init UI:', error);
      });
    }
    
    // Icône → Interface (clic ouvre l'interface)
    if (this.icon) {
      this.icon.onClick = () => {
        if (this.canOpenUI()) {
          this.ui.toggle();
        } else {
          this.showCannotOpenMessage();
        }
      };
    }
    
    // Manager → Icône (mise à jour des stats)
    if (this.manager) {
      this.manager.onStatsUpdate = (stats) => {
        if (this.icon) {
          this.icon.updateStats(stats);
        }
      };
      
      // Manager → Interface (mise à jour des données)
      this.manager.onQuestUpdate = (quests) => {
        if (this.ui) {
          this.ui.updateQuestData(quests, 'active');
          
          // Si l'UI est visible, forcer un refresh
          if (this.ui.isVisible) {
            setTimeout(() => {
              this.ui.refreshQuestList?.();
              this.ui.updateTracker?.();
            }, 100);
          }
        }
      };
      
      // Manager → Interface (quête démarrée)
      this.manager.onQuestStarted = (quest) => {
        if (this.icon) {
          this.icon.animateNewQuest();
        }
        
        // Notification via NotificationManager si disponible
        if (typeof window.showGameNotification === 'function') {
          window.showGameNotification(
            `Nouvelle quête: ${quest.name || 'Quête sans nom'}`,
            'success',
            { duration: 3000 }
          );
        }
      };
      
      // Manager → Interface (quête terminée)
      this.manager.onQuestCompleted = (quest) => {
        if (this.icon) {
          this.icon.animateQuestCompleted();
        }
        
        if (typeof window.showGameNotification === 'function') {
          window.showGameNotification(
            `Quête terminée !`,
            'success',
            { duration: 3000 }
          );
        }
      };
      
      // Manager → Interface (progression)
      this.manager.onQuestProgress = (progress) => {
        if (this.icon) {
          this.icon.animateQuestProgress();
        }
      };
    }
    
    // Interface → Manager (actions utilisateur)
    if (this.ui) {
      this.ui.onAction = (action, data) => {
        if (this.manager) {
          this.manager.handleAction(action, data);
        }
      };
    }
    
    console.log('✅ [QuestModule] Composants Quest connectés');
  }
  
  // === 📊 MÉTHODES SPÉCIFIQUES QUEST ===
  
  /**
   * Demander les données Quest (override de la méthode générique)
   */
  show() {
    const result = super.show();
    
    // Demander données Quest spécifiquement
    if (this.manager) {
      setTimeout(() => {
        this.manager.requestQuestData();
      }, 200);
    }
    
    return result;
  }
  
  /**
   * Afficher le tracker de quêtes
   */
  showTracker() {
    if (this.ui) {
      this.ui.showTracker();
    }
  }
  
  /**
   * Masquer le tracker de quêtes
   */
  hideTracker() {
    if (this.ui) {
      this.ui.hideTracker();
    }
  }
  
  /**
   * Toggle du tracker de quêtes
   */
  toggleTracker() {
    if (this.ui) {
      this.ui.toggleTracker();
    }
  }
  
  /**
   * Obtenir les quêtes actives
   */
  getActiveQuests() {
    return this.manager ? this.manager.getActiveQuests() : [];
  }
  
  /**
   * Obtenir les statistiques de quêtes
   */
  getQuestStats() {
    return this.manager ? this.manager.getQuestStats() : null;
  }
  
  /**
   * Vérifier si des quêtes sont actives
   */
  hasActiveQuests() {
    return this.manager ? this.manager.hasActiveQuests() : false;
  }
  
  /**
   * Démarrer une quête
   */
  startQuest(questId) {
    if (this.manager) {
      this.manager.startQuest(questId);
    }
  }
  
  /**
   * Déclencher progression de quête
   */
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
  
  /**
   * Afficher dialogue de quête (pour interactions NPC)
   */
  showQuestDialog(title, quests, onSelectQuest) {
    if (this.ui) {
      this.ui.showQuestDialog(title, quests, onSelectQuest);
    }
  }
  
  /**
   * API legacy pour compatibilité
   */
  toggleQuestJournal() {
    this.toggleUI();
  }
  
  openQuestJournal() {
    this.open();
  }
  
  closeQuestJournal() {
    this.close();
  }
  
  openQuest() {
    this.open();
  }
  
  closeQuest() {
    this.close();
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS QUEST ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    // Ajouter infos spécifiques Quest
    return {
      ...baseState,
      questCount: this.manager ? this.manager.getQuestCount() : 0,
      hasActiveQuests: this.manager ? this.manager.hasActiveQuests() : false,
      moduleType: 'quest'
    };
  }
}

// === 🏭 FACTORY QUEST SIMPLIFIÉE ===

/**
 * Factory function pour créer le module Quest
 * Utilise la factory générique de BaseModule
 */
export async function createQuestModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [QuestFactory] Création module Quest avec BaseModule...');
    
    const questOptions = {
      singleton: true,
      ...options
    };
    
    const questInstance = await createModule(QuestModule, 'quest', gameRoom, scene, questOptions);
    
    console.log('✅ [QuestFactory] Module Quest créé avec succès');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestFactory] Erreur création module Quest:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION QUEST POUR UIMANAGER ===

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
    version: '2.0.0',
    category: 'Quest Management'
  },
  
  factory: () => createQuestModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER SIMPLIFIÉE ===

/**
 * Enregistrer le module Quest dans UIManager
 */
export async function registerQuestModule(uiManager) {
  try {
    console.log('📝 [QuestIntegration] Enregistrement Quest...');
    
    // Vérifier si déjà enregistré
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

/**
 * Initialiser et connecter le module Quest
 */
export async function initializeQuestModule(uiManager) {
  try {
    console.log('🚀 [QuestIntegration] Initialisation Quest...');
    
    // Enregistrer le module
    await registerQuestModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let questInstance = QuestModule.getInstance('quest');
    
    if (!questInstance || !questInstance.uiManagerState.initialized) {
      // Initialiser le module
      questInstance = await uiManager.initializeModule('quest');
    } else {
      console.log('ℹ️ [QuestIntegration] Instance déjà initialisée');
      
      // Connecter à UIManager si pas encore fait
      questInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Quest
    setupQuestGlobalEvents(questInstance);
    
    console.log('✅ [QuestIntegration] Initialisation Quest terminée');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX QUEST ===

function setupQuestGlobalEvents(questInstance) {
  // Éviter double setup
  if (window._questEventsSetup) {
    console.log('ℹ️ [QuestEvents] Événements déjà configurés');
    return;
  }
  
  // Événement: Item collecté
  window.addEventListener('itemCollected', (event) => {
    if (questInstance.manager) {
      const { itemId, amount } = event.detail;
      questInstance.triggerProgress('collect', { itemId, amount });
    }
  });
  
  // Événement: Pokémon vaincu
  window.addEventListener('pokemonDefeated', (event) => {
    if (questInstance.manager) {
      const { pokemonId } = event.detail;
      questInstance.triggerProgress('defeat', { pokemonId });
    }
  });
  
  // Événement: Zone visitée
  window.addEventListener('zoneEntered', (event) => {
    if (questInstance.manager) {
      const { zoneId, x, y, map } = event.detail;
      questInstance.triggerProgress('reach', { zoneId, x, y, map });
    }
  });
  
  // Événement: Interaction NPC
  window.addEventListener('npcInteraction', (event) => {
    if (questInstance.manager && event.detail.type === 'questGiver') {
      const { availableQuests, npcName } = event.detail;
      if (availableQuests && availableQuests.length > 0) {
        questInstance.showQuestDialog(
          `Quêtes disponibles - ${npcName || 'PNJ'}`,
          availableQuests,
          (questId) => {
            questInstance.startQuest(questId);
          }
        );
      }
    }
  });
  
  // Événement: Combat commencé - masquer UI
  window.addEventListener('battleStarted', () => {
    if (questInstance.ui && questInstance.ui.isVisible) {
      questInstance.ui.hide();
    }
    if (questInstance.ui && questInstance.ui.isTrackerVisible) {
      questInstance.ui.hideTracker();
    }
  });
  
  // Événement: Combat terminé - restaurer UI
  window.addEventListener('battleEnded', () => {
    if (questInstance.ui) {
      questInstance.ui.showTracker();
    }
  });
  
  window._questEventsSetup = true;
  console.log('🌐 [QuestEvents] Événements Quest configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Quest dans un projet
 */
export async function setupQuestSystem(uiManager) {
  try {
    console.log('🔧 [QuestSetup] Configuration système Quest avec BaseModule...');
    
    // Initialiser le module
    const questInstance = await initializeQuestModule(uiManager);
    
    // Exposer globalement pour compatibilité
    if (!window.questSystem) {
      window.questSystem = questInstance;
      window.questSystemGlobal = questInstance;
      window.toggleQuest = () => questInstance.toggleUI();
      window.openQuest = () => questInstance.open();
      window.closeQuest = () => questInstance.close();
      window.forceCloseQuest = () => questInstance.forceCloseUI();
      
      // Méthodes spécifiques Quest
      window.toggleQuestJournal = () => questInstance.toggleUI();
      window.openQuestJournal = () => questInstance.open();
      window.closeQuestJournal = () => questInstance.close();
      window.toggleQuestTracker = () => questInstance.toggleTracker();
      window.showQuestTracker = () => questInstance.showTracker();
      window.hideQuestTracker = () => questInstance.hideTracker();
      
      // API pour déclencher progression
      window.triggerQuestProgress = (type, data) => questInstance.triggerProgress(type, data);
      window.startQuest = (questId) => questInstance.startQuest(questId);
      window.showQuestDialog = (title, quests, callback) => questInstance.showQuestDialog(title, quests, callback);
      
      console.log('🌐 [QuestSetup] Fonctions globales Quest exposées');
    }
    
    console.log('✅ [QuestSetup] Système Quest configuré avec BaseModule');
    return questInstance;
    
  } catch (error) {
    console.error('❌ [QuestSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG QUEST ===

export function debugQuestModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('quest', QuestModule);
}

export function fixQuestModule() {
  console.log('🔧 [QuestFix] Réparation module Quest...');
  
  try {
    const instance = QuestModule.getInstance('quest');
    
    if (instance) {
      // Force fermeture UI via BaseModule
      instance.forceCloseUI();
      
      // Force fermeture tracker
      if (instance.ui) {
        instance.ui.hideTracker();
      }
      
      console.log('✅ [QuestFix] Module Quest réparé');
      return true;
    } else {
      console.log('ℹ️ [QuestFix] Aucune instance à réparer');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [QuestFix] Erreur réparation:', error);
    return false;
  }
}

// === 📈 MÉTHODES UTILITAIRES QUEST ===

/**
 * Déclencher des événements de progression depuis l'extérieur
 */
export function triggerQuestCollect(itemId, amount = 1) {
  const instance = QuestModule.getInstance('quest');
  if (instance) {
    instance.triggerProgress('collect', { itemId, amount });
  }
}

export function triggerQuestDefeat(pokemonId) {
  const instance = QuestModule.getInstance('quest');
  if (instance) {
    instance.triggerProgress('defeat', { pokemonId });
  }
}

export function triggerQuestReach(zoneId, x, y, map) {
  const instance = QuestModule.getInstance('quest');
  if (instance) {
    instance.triggerProgress('reach', { zoneId, x, y, map });
  }
}

export function triggerQuestDeliver(npcId, itemId) {
  const instance = QuestModule.getInstance('quest');
  if (instance) {
    instance.triggerProgress('deliver', { npcId, itemId });
  }
}

/**
 * Gestion des interactions NPC avec quêtes
 */
export function handleNpcQuestInteraction(npcData) {
  const instance = QuestModule.getInstance('quest');
  if (instance && npcData.availableQuests && npcData.availableQuests.length > 0) {
    instance.showQuestDialog(
      `Quêtes disponibles - ${npcData.npcName || 'PNJ'}`,
      npcData.availableQuests,
      (questId) => {
        instance.startQuest(questId);
      }
    );
    return true;
  }
  return false;
}

/**
 * Obtenir informations sur les quêtes actives
 */
export function getQuestInfo() {
  const instance = QuestModule.getInstance('quest');
  if (instance) {
    return {
      activeQuests: instance.getActiveQuests(),
      questStats: instance.getQuestStats(),
      hasActiveQuests: instance.hasActiveQuests(),
      moduleState: instance.getUIManagerState()
    };
  }
  return null;
}

/**
 * Configuration du tracker de quêtes
 */
export function configureQuestTracker(options = {}) {
  const instance = QuestModule.getInstance('quest');
  if (instance && instance.ui) {
    if (options.maxQuests !== undefined) {
      instance.ui.maxTrackedQuests = options.maxQuests;
    }
    if (options.visible !== undefined) {
      if (options.visible) {
        instance.ui.showTracker();
      } else {
        instance.ui.hideTracker();
      }
    }
    if (options.minimized !== undefined) {
      if (options.minimized) {
        instance.ui.toggleTrackerMinimize();
      }
    }
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default QuestModule;

console.log(`
📖 === QUEST MODULE AVEC BASEMODULE ===

🎯 NOUVELLES FONCTIONNALITÉS:
• BaseModule - logique UIManager mutualisée
• Code simplifié - moins de duplication
• Patterns standards - consistent entre modules
• Singleton intégré - via BaseModule

📍 AVANTAGES BASEMODULE:
• connectUIManager() générique
• forceCloseUI() standardisé
• Gestion état UIManager uniforme
• Raccourcis clavier automatiques (L)

🔧 MÉTHODES HÉRITÉES:
• show(), hide(), setEnabled() - standards
• connectUIManager() - connexion sécurisée
• getUIManagerState() - état complet
• forceCloseUI() - fermeture forcée

🎯 SPÉCIFICITÉS QUEST:
• getActiveQuests() - quêtes actives
• hasActiveQuests() - vérification
• startQuest(id) - démarrer quête
• triggerProgress(type, data) - progression
• showQuestDialog() - dialogues NPC
• showTracker()/hideTracker() - tracker

📊 API PROGRESSION:
• triggerQuestCollect(itemId, amount)
• triggerQuestDefeat(pokemonId)
• triggerQuestReach(zoneId, x, y, map)
• triggerQuestDeliver(npcId, itemId)

🌐 ÉVÉNEMENTS GLOBAUX:
• itemCollected → progression automatique
• pokemonDefeated → progression automatique
• zoneEntered → progression automatique
• npcInteraction → dialogues automatiques
• battleStarted/Ended → UI adaptative

💡 UTILISATION SIMPLE:
• setupQuestSystem(uiManager) - Setup complet
• handleNpcQuestInteraction(npcData) - NPC
• getQuestInfo() - Informations
• configureQuestTracker(options) - Config

✅ QUEST REFACTORISÉ AVEC BASEMODULE !
`);
