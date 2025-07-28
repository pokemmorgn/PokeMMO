// Team/index.js - TeamModule avec support traductions
// 🌐 MODIFICATION: Passe optionsManager aux composants
// 📍 Changement minimal sur createComponents()

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
    
    // === 🌐 NOUVEAU: Support optionsManager ===
    this.optionsManager = options.optionsManager || null;
    
    console.log('⚔️ [TeamModule] Instance créée avec BaseModule et optionsManager:', !!this.optionsManager);
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
   * 🌐 MODIFIÉ: Passe optionsManager aux composants
   */
  createComponents() {
    console.log('🔧 [TeamModule] Création composants Team avec optionsManager...');
    
    // Créer l'icône si pas encore fait
    if (!this.icon) {
      // 🌐 MODIFICATION: Passer optionsManager à TeamIcon
      this.icon = new TeamIcon(this.manager, this.optionsManager);
      this.icon.init();
      console.log('🎨 [TeamModule] TeamIcon créé avec optionsManager:', !!this.optionsManager);
    }
    
    // Créer l'interface si pas encore fait
    if (!this.ui) {
      // 🌐 MODIFICATION: Passer optionsManager à TeamUI
      this.ui = new TeamUI(this.manager, this.gameRoom, this.optionsManager);
      console.log('🖼️ [TeamModule] TeamUI créé avec optionsManager:', !!this.optionsManager);
    }
    
    console.log('✅ [TeamModule] Composants Team créés avec support traductions');
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
  
  // === 📊 MÉTHODES SPÉCIFIQUES TEAM (INCHANGÉES) ===
  
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
      moduleType: 'team',
      hasOptionsManager: !!this.optionsManager // 🌐 NOUVEAU: Info debug
    };
  }
}

// === 🏭 FACTORY TEAM AVEC SUPPORT OPTIONSMANAGER ===

/**
 * Factory function pour créer le module Team
 * 🌐 MODIFIÉ: Accepte optionsManager en paramètre
 */
export async function createTeamModule(gameRoom, scene, options = {}) {
  try {
    console.log('🏭 [TeamFactory] Création module Team avec optionsManager...');
    
    const teamOptions = {
      singleton: true,
      ...options
    };
    
    const teamInstance = await createModule(TeamModule, 'team', gameRoom, scene, teamOptions);
    
    console.log('✅ [TeamFactory] Module Team créé avec support traductions');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamFactory] Erreur création module Team:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION TEAM POUR UIMANAGER (INCHANGÉE) ===

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

// === 🔗 INTÉGRATION AVEC UIMANAGER ===

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
 * 🌐 MODIFIÉ: Peut recevoir optionsManager
 */
export async function initializeTeamModule(uiManager, optionsManager = null) {
  try {
    console.log('🚀 [TeamIntegration] Initialisation Team avec optionsManager...');
    
    // Enregistrer le module
    await registerTeamModule(uiManager);
    
    // Vérifier si déjà initialisé (singleton)
    let teamInstance = TeamModule.getInstance('team');
    
    if (!teamInstance || !teamInstance.uiManagerState.initialized) {
      // 🌐 MODIFICATION: Passer optionsManager dans les options
      const initOptions = optionsManager ? { optionsManager } : {};
      teamInstance = await uiManager.initializeModule('team', initOptions);
      
      console.log('🌐 [TeamIntegration] Team initialisé avec optionsManager:', !!optionsManager);
    } else {
      console.log('ℹ️ [TeamIntegration] Instance déjà initialisée');
      
      // 🌐 NOUVEAU: Injecter optionsManager si pas encore fait
      if (optionsManager && !teamInstance.optionsManager) {
        teamInstance.optionsManager = optionsManager;
        console.log('🌐 [TeamIntegration] OptionsManager injecté dans instance existante');
        
        // Recréer composants avec optionsManager si nécessaire
        if (teamInstance.icon && !teamInstance.icon.optionsManager) {
          console.log('🔄 [TeamIntegration] Mise à jour TeamIcon avec optionsManager...');
          teamInstance.icon.optionsManager = optionsManager;
          teamInstance.icon.setupLanguageSupport?.();
        }
        
        if (teamInstance.ui && !teamInstance.ui.optionsManager) {
          console.log('🔄 [TeamIntegration] Mise à jour TeamUI avec optionsManager...');
          teamInstance.ui.optionsManager = optionsManager;
          teamInstance.ui.setupLanguageSupport?.();
        }
      }
      
      // Connecter à UIManager si pas encore fait
      teamInstance.connectUIManager(uiManager);
    }
    
    // Setup des événements globaux Team
    setupTeamGlobalEvents(teamInstance);
    
    console.log('✅ [TeamIntegration] Initialisation Team terminée avec traductions');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === 🌐 ÉVÉNEMENTS GLOBAUX TEAM (INCHANGÉS) ===

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

// === 💡 UTILISATION SIMPLE AVEC OPTIONSMANAGER ===

/**
 * Fonction d'utilisation simple pour intégrer Team dans un projet
 * 🌐 MODIFIÉ: Accepte optionsManager
 */
export async function setupTeamSystem(uiManager, optionsManager = null) {
  try {
    console.log('🔧 [TeamSetup] Configuration système Team avec traductions...');
    
    // Initialiser le module avec optionsManager
    const teamInstance = await initializeTeamModule(uiManager, optionsManager);
    
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

// === 🔍 UTILITÉS DE DEBUG TEAM (INCHANGÉES) ===

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
⚔️ === TEAM MODULE AVEC SUPPORT TRADUCTIONS ===

🌐 MODIFICATIONS APPORTÉES:
• Constructor accepte optionsManager dans options
• createComponents() passe optionsManager aux composants
• initializeTeamModule() accepte optionsManager en paramètre
• setupTeamSystem() modifié pour passer optionsManager
• Injection optionsManager dans instances existantes

🔧 CHANGEMENTS TECHNIQUES:
• TeamIcon(manager, optionsManager) 
• TeamUI(manager, gameRoom, optionsManager)
• Support injection tardive si instance déjà existante
• Debug info inclut hasOptionsManager

📋 UTILISATION:
• setupTeamSystem(uiManager, optionsManager)
• initializeTeamModule(uiManager, optionsManager)
• createTeamModule(gameRoom, scene, { optionsManager })

✅ PRÊT POUR VALIDATION AVANT TEAMUI !
`);
