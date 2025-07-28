// Team/index.js - TeamModule avec support traductions
// 🌐 Passe optionsManager aux composants pour traductions temps réel
// 📍 Modification minimale de l'existant

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { TeamManager } from './TeamManager.js';
import { TeamIcon } from './TeamIcon.js';
import { TeamUI } from './TeamUI.js';
import { initLocalizationManager } from '../managers/LocalizationManager.js';

/**
 * Module Team utilisant BaseModule avec support traductions
 */
export class TeamModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Team
    const teamOptions = {
      singleton: true,           
      autoCloseUI: true,         
      keyboardShortcut: 't',     
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 2,                
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'team', gameRoom, scene, teamOptions);
    
    // === 🌐 NOUVEAU: Support optionsManager ===
    this.optionsManager = options.optionsManager || window.optionsSystem || null;
    
    console.log('⚔️ [TeamModule] Instance créée avec optionsManager:', !!this.optionsManager);
  }
  
  /**
   * Initialisation spécifique Team avec traductions
   */
  async init() {
    console.log('🚀 [TeamModule] Initialisation avec traductions...');
    
    // 🌐 Initialiser traductions si pas encore fait
    try {
      await initLocalizationManager();
      console.log('✅ [TeamModule] Traductions initialisées');
    } catch (error) {
      console.warn('⚠️ [TeamModule] Erreur init traductions:', error);
    }
    
    // Créer le manager (business logic)
    this.manager = new TeamManager(this.gameRoom);
    await this.manager.init();
    
    console.log('✅ [TeamModule] Manager Team initialisé');
  }
  
  /**
   * Création des composants avec optionsManager
   */
  createComponents() {
    console.log('🔧 [TeamModule] Création composants avec traductions...');
    
    // Créer l'icône avec optionsManager 🌐
    if (!this.icon) {
      this.icon = new TeamIcon(this.manager, this.optionsManager);
      this.icon.init();
      console.log('🎨 [TeamModule] TeamIcon créée avec optionsManager');
    }
    
    // Créer l'interface avec optionsManager 🌐
    if (!this.ui) {
      this.ui = new TeamUI(this.manager, this.gameRoom, this.optionsManager);
      // L'init de TeamUI est async, on le fait dans connectComponents
      console.log('🖼️ [TeamModule] TeamUI créée avec optionsManager');
    }
    
    console.log('✅ [TeamModule] Composants Team créés avec traductions');
  }
  
  /**
   * Connexion des composants Team
   */
  connectComponents() {
    console.log('🔗 [TeamModule] Connexion composants Team...');
    
    // Initialiser UI de manière async
    if (this.ui && !this.ui.initialized) {
      this.ui.init().catch(error => {
        console.error('❌ [TeamModule] Erreur init UI:', error);
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
      this.manager.onTeamDataUpdate = (data) => {
        if (this.ui) {
          this.ui.updateTeamData(data);
          
          // Si l'UI est visible, forcer un refresh
          if (this.ui.isVisible) {
            setTimeout(() => {
              this.ui.refreshCompleteDisplay?.();
              this.ui.updateCompleteStats?.();
            }, 100);
          }
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
    
    console.log('✅ [TeamModule] Composants Team connectés');
  }
  
  // === 📊 MÉTHODES SPÉCIFIQUES TEAM (inchangées) ===
  
  show() {
    const result = super.show();
    
    // Demander données Team spécifiquement
    if (this.manager) {
      setTimeout(() => {
        this.manager.requestTeamData();
      }, 200);
    }
    
    return result;
  }
  
  getTeamData() {
    return this.manager ? this.manager.getTeamData() : [];
  }
  
  getTeamStats() {
    return this.manager ? this.manager.getTeamStats() : null;
  }
  
  canBattle() {
    return this.manager ? this.manager.canBattle() : false;
  }
  
  healTeam() {
    if (this.manager) {
      this.manager.healTeam();
    }
  }
  
  // API legacy pour compatibilité
  toggleTeamUI() {
    this.toggleUI();
  }
  
  openTeam() {
    this.open();
  }
  
  closeTeam() {
    this.close();
  }
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    return {
      ...baseState,
      teamCount: this.manager ? this.manager.getTeamCount() : 0,
      canBattle: this.manager ? this.manager.canBattle() : false,
      moduleType: 'team'
    };
  }
}

// === 🏭 FACTORY TEAM AVEC OPTIONSMANAGER ===

/**
 * Factory function pour créer le module Team avec optionsManager
 */
export async function createTeamModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [TeamFactory] Création module Team avec traductions...');
    
    // 🌐 S'assurer qu'optionsManager est passé
    const teamOptions = {
      singleton: true,
      optionsManager: options.optionsManager || window.optionsSystem || null,
      ...options
    };
    
    const teamInstance = await createModule(TeamModule, 'team', gameRoom, scene, teamOptions);
    
    console.log('✅ [TeamFactory] Module Team créé avec traductions');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamFactory] Erreur création module Team:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION TEAM MISE À JOUR ===

export const TEAM_MODULE_CONFIG = generateModuleConfig('team', {
  moduleClass: TeamModule,
  order: 2,
  
  options: {
    singleton: true,
    keyboardShortcut: 't',
    // 🌐 optionsManager sera ajouté dynamiquement
  },
  
  groups: ['ui-icons', 'pokemon-management'],
  
  metadata: {
    name: 'Team Manager',
    description: 'Complete Pokemon team management system with multilingual support',
    version: '2.1.0',
    category: 'Pokemon Management'
  },
  
  // 🌐 Factory mise à jour pour passer optionsManager
  factory: (options = {}) => createTeamModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0],
    {
      optionsManager: window.optionsSystem,
      ...options
    }
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER AMÉLIORÉE ===

export async function registerTeamModule(uiManager) {
  try {
    console.log('📝 [TeamIntegration] Enregistrement Team avec traductions...');
    
    if (uiManager.modules && uiManager.modules.has('team')) {
      console.log('ℹ️ [TeamIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('team', TEAM_MODULE_CONFIG);
    console.log('✅ [TeamIntegration] Module Team enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

export async function initializeTeamModule(uiManager) {
  try {
    console.log('🚀 [TeamIntegration] Initialisation Team avec traductions...');
    
    await registerTeamModule(uiManager);
    
    let teamInstance = TeamModule.getInstance('team');
    
    if (!teamInstance || !teamInstance.uiManagerState.initialized) {
      // 🌐 Passer optionsManager lors de l'initialisation
      teamInstance = await uiManager.initializeModule('team', {
        optionsManager: window.optionsSystem
      });
    } else {
      console.log('ℹ️ [TeamIntegration] Instance déjà initialisée');
      teamInstance.connectUIManager(uiManager);
    }
    
    setupTeamGlobalEvents(teamInstance);
    
    console.log('✅ [TeamIntegration] Initialisation Team terminée');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX TEAM (inchangés) ===

function setupTeamGlobalEvents(teamInstance) {
  if (window._teamEventsSetup) {
    console.log('ℹ️ [TeamEvents] Événements déjà configurés');
    return;
  }
  
  window.addEventListener('pokemonCaught', (event) => {
    if (teamInstance.manager) {
      teamInstance.manager.handlePokemonCaught(event.detail);
    }
  });
  
  window.addEventListener('battleStarted', () => {
    if (teamInstance.ui && teamInstance.ui.isVisible) {
      teamInstance.ui.hide();
    }
  });
  
  window.addEventListener('pokemonCenterEntered', () => {
    if (teamInstance.manager) {
      teamInstance.manager.requestTeamData();
    }
  });
  
  window._teamEventsSetup = true;
  console.log('🌐 [TeamEvents] Événements Team configurés');
}

// === 💡 UTILISATION SIMPLE MISE À JOUR ===

export async function setupTeamSystem(uiManager) {
  try {
    console.log('🔧 [TeamSetup] Configuration système Team avec traductions...');
    
    // 🌐 S'assurer que les traductions sont initialisées
    await initLocalizationManager();
    
    const teamInstance = await initializeTeamModule(uiManager);
    
    // Exposer globalement pour compatibilité
    if (!window.teamSystem) {
      window.teamSystem = teamInstance;
      window.teamSystemGlobal = teamInstance;
      window.toggleTeam = () => teamInstance.toggleUI();
      window.openTeam = () => teamInstance.open();
      window.closeTeam = () => teamInstance.close();
      window.forceCloseTeam = () => teamInstance.forceCloseUI();
      
      console.log('🌐 [TeamSetup] Fonctions globales Team exposées');
    }
    
    console.log('✅ [TeamSetup] Système Team configuré avec traductions');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG TEAM (inchangées) ===

export function debugTeamModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('team', TeamModule);
}

export function fixTeamModule() {
  console.log('🔧 [TeamFix] Réparation module Team...');
  
  try {
    const instance = TeamModule.getInstance('team');
    
    if (instance) {
      instance.forceCloseUI();
      console.log('✅ [TeamFix] Module Team réparé');
      return true;
    } else {
      console.log('ℹ️ [TeamFix] Aucune instance à réparer');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [TeamFix] Erreur réparation:', error);
    return false;
  }
}

export default TeamModule;
