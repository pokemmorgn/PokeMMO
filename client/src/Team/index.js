// Team/index.js - TeamModule refactorisé avec BaseModule
// 🎯 UTILISE BaseModule pour éviter duplication de code
// 📍 INTÉGRÉ avec UIManager via BaseModule
// 🆕 CODE SIMPLIFIÉ ET MAINTENABLE

import { BaseModule, createModule, generateModuleConfig } from '../core/BaseModule.js';
import { TeamManager } from './TeamManager.js';
import { TeamIcon } from './TeamIcon.js';
import { TeamUI } from './TeamUI.js';

/**
 * Module Team utilisant BaseModule
 * Hérite de toute la logique UIManager générique
 */
export class TeamModule extends BaseModule {
  constructor(moduleId, gameRoom, scene, options = {}) {
    // Configuration spécifique Team
    const teamOptions = {
      singleton: true,           // Team est un singleton
      autoCloseUI: true,         // Fermer UI par défaut
      keyboardShortcut: 't',     // Touche T pour ouvrir/fermer
      uiManagerConfig: {
        anchor: 'bottom-right',
        order: 2,                // Après inventory (0) et quest (1)
        group: 'ui-icons'
      },
      ...options
    };
    
    super(moduleId || 'team', gameRoom, scene, teamOptions);
    
    console.log('⚔️ [TeamModule] Instance créée avec BaseModule');
  }
  
  // === 🎯 IMPLÉMENTATION DES MÉTHODES ABSTRAITES ===
  
  /**
   * Initialisation spécifique Team
   */
  async init() {
    console.log('🚀 [TeamModule] Initialisation métier Team...');
    
    // Créer le manager (business logic)
    this.manager = new TeamManager(this.gameRoom);
    await this.manager.init();
    
    console.log('✅ [TeamModule] Manager Team initialisé');
  }
  
  /**
   * Création des composants Team
   */
  createComponents() {
    console.log('🔧 [TeamModule] Création composants Team...');
    
    // Créer l'icône si pas encore fait
    if (!this.icon) {
      this.icon = new TeamIcon(this.manager);
      this.icon.init();
    }
    
    // Créer l'interface si pas encore fait
    if (!this.ui) {
      this.ui = new TeamUI(this.manager, this.gameRoom);
      // Note: L'init de TeamUI est async, on le fait dans connectComponents si nécessaire
    }
    
    console.log('✅ [TeamModule] Composants Team créés');
  }
  
  /**
   * Connexion des composants Team
   */
  connectComponents() {
    console.log('🔗 [TeamModule] Connexion composants Team...');
    
    // Initialiser UI de manière async si nécessaire
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
  
  // === 📊 MÉTHODES SPÉCIFIQUES TEAM ===
  
  /**
   * Demander les données Team (override de la méthode générique)
   */
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
  
  /**
   * Obtenir les données d'équipe
   */
  getTeamData() {
    return this.manager ? this.manager.getTeamData() : [];
  }
  
  /**
   * Obtenir les statistiques d'équipe
   */
  getTeamStats() {
    return this.manager ? this.manager.getTeamStats() : null;
  }
  
  /**
   * Vérifier si l'équipe peut combattre
   */
  canBattle() {
    return this.manager ? this.manager.canBattle() : false;
  }
  
  /**
   * Soigner toute l'équipe
   */
  healTeam() {
    if (this.manager) {
      this.manager.healTeam();
    }
  }
  
  /**
   * API legacy pour compatibilité
   */
  toggleTeamUI() {
    this.toggleUI();
  }
  
  openTeam() {
    this.open();
  }
  
  closeTeam() {
    this.close();
  }
  
  // === 📋 OVERRIDE STATE POUR INFOS TEAM ===
  
  getUIManagerState() {
    const baseState = super.getUIManagerState();
    
    // Ajouter infos spécifiques Team
    return {
      ...baseState,
      teamCount: this.manager ? this.manager.getTeamCount() : 0,
      canBattle: this.manager ? this.manager.canBattle() : false,
      moduleType: 'team'
    };
  }
}

// === 🏭 FACTORY TEAM SIMPLIFIÉE ===

/**
 * Factory function pour créer le module Team
 * Utilise la factory générique de BaseModule
 */
export async function createTeamModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [TeamFactory] Création module Team avec BaseModule...');
    
    const teamOptions = {
      singleton: true,
      ...options
    };
    
    const teamInstance = await createModule(TeamModule, 'team', gameRoom, scene, teamOptions);
    
    console.log('✅ [TeamFactory] Module Team créé avec succès');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamFactory] Erreur création module Team:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION TEAM POUR UIMANAGER ===

export const TEAM_MODULE_CONFIG = generateModuleConfig('team', {
  moduleClass: TeamModule,
  order: 2,
  
  options: {
    singleton: true,
    keyboardShortcut: 't'
  },
  
  groups: ['ui-icons', 'pokemon-management'],
  
  metadata: {
    name: 'Team Manager',
    description: 'Complete Pokemon team management system',
    version: '2.0.0',
    category: 'Pokemon Management'
  },
  
  factory: () => createTeamModule(
    window.currentGameRoom, 
    window.game?.scene?.getScenes(true)[0]
  )
});

// === 🔗 INTÉGRATION AVEC UIMANAGER SIMPLIFIÉE ===

/**
 * Enregistrer le module Team dans UIManager
 */
export async function registerTeamModule(uiManager) {
  try {
    console.log('📝 [TeamIntegration] Enregistrement Team...');
    
    // Vérifier si déjà enregistré
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

/**
 * Initialiser et connecter le module Team
 */
export async function initializeTeamModule(uiManager) {
  try {
    console.log('🚀 [TeamIntegration] Initialisation Team...');
    
    // Enregistrer le module
    await registerTeamModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let teamInstance = TeamModule.getInstance('team');
    
    if (!teamInstance || !teamInstance.uiManagerState.initialized) {
      // Initialiser le module
      teamInstance = await uiManager.initializeModule('team');
    } else {
      console.log('ℹ️ [TeamIntegration] Instance déjà initialisée');
      
      // Connecter à UIManager si pas encore fait
      teamInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Team
    setupTeamGlobalEvents(teamInstance);
    
    console.log('✅ [TeamIntegration] Initialisation Team terminée');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX TEAM ===

function setupTeamGlobalEvents(teamInstance) {
  // Éviter double setup
  if (window._teamEventsSetup) {
    console.log('ℹ️ [TeamEvents] Événements déjà configurés');
    return;
  }
  
  // Événement: Pokémon capturé
  window.addEventListener('pokemonCaught', (event) => {
    if (teamInstance.manager) {
      teamInstance.manager.handlePokemonCaught(event.detail);
    }
  });
  
  // Événement: Combat commencé
  window.addEventListener('battleStarted', () => {
    if (teamInstance.ui && teamInstance.ui.isVisible) {
      teamInstance.ui.hide();
    }
  });
  
  // Événement: Centre Pokémon
  window.addEventListener('pokemonCenterEntered', () => {
    if (teamInstance.manager) {
      teamInstance.manager.requestTeamData(); // Refresh data
    }
  });
  
  window._teamEventsSetup = true;
  console.log('🌐 [TeamEvents] Événements Team configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Team dans un projet
 */
export async function setupTeamSystem(uiManager) {
  try {
    console.log('🔧 [TeamSetup] Configuration système Team avec BaseModule...');
    
    // Initialiser le module
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
    
    console.log('✅ [TeamSetup] Système Team configuré avec BaseModule');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 🔍 UTILITÉS DE DEBUG TEAM ===

export function debugTeamModule() {
  const { debugModule } = require('../core/BaseModule.js');
  return debugModule('team', TeamModule);
}

export function fixTeamModule() {
  console.log('🔧 [TeamFix] Réparation module Team...');
  
  try {
    const instance = TeamModule.getInstance('team');
    
    if (instance) {
      // Force fermeture UI via BaseModule
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

// === 📋 EXPORT PAR DÉFAUT ===

export default TeamModule;

console.log(`
⚔️ === TEAM MODULE AVEC BASEMODULE ===

🎯 NOUVELLES FONCTIONNALITÉS:
• BaseModule - logique UIManager mutualisée
• Code simplifié - moins de duplication
• Patterns standards - consistent entre modules
• Singleton intégré - via BaseModule

📍 AVANTAGES BASEMODULE:
• connectUIManager() générique
• forceCloseUI() standardisé
• Gestion état UIManager uniforme
• Raccourcis clavier automatiques

🔧 MÉTHODES HÉRITÉES:
• show(), hide(), setEnabled() - standards
• connectUIManager() - connexion sécurisée
• getUIManagerState() - état complet
• forceCloseUI() - fermeture forcée

🎯 SPÉCIFICITÉS TEAM:
• getTeamData() - données équipe
• canBattle() - vérification combat
• healTeam() - soin équipe
• API legacy maintenue

✅ TEAM REFACTORISÉ AVEC BASEMODULE !
`);
