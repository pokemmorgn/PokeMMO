// Team/index.js - Module Team Unifié pour Pokémon MMO
// 🎯 1 SEUL module qui gère TOUT : business logic + icône + interface

import { TeamManager } from './TeamManager.js';
import { TeamIcon } from './TeamIcon.js';
import { TeamUI } from './TeamUI.js';

/**
 * Module Team Unifié
 * Compatible avec UIManager simplifié
 * API simple: show(), hide(), setEnabled()
 */
export class TeamModule {
  constructor(gameRoom, scene) {
    this.gameRoom = gameRoom;
    this.scene = scene;
    
    // === INSTANCES DES COMPOSANTS ===
    this.manager = null;
    this.icon = null;
    this.ui = null;
    
    // === ÉTAT UIManager ===
    this.uiManagerState = {
      visible: true,        // Icône visible par défaut
      enabled: true,        // Module activé
      initialized: false    // Non encore initialisé
    };
    
    console.log('⚔️ [TeamModule] Instance créée (version unifiée)');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamModule] Initialisation...');
      
      // 1. Créer le manager (business logic)
      this.manager = new TeamManager(this.gameRoom);
      await this.manager.init();
      
      // 2. Créer l'icône
      this.icon = new TeamIcon(this.manager);
      this.icon.init();
      
      // 3. Créer l'interface
      this.ui = new TeamUI(this.manager, this.gameRoom);
      await this.ui.init();
      
      // 4. Connecter les composants
      this.connectComponents();
      
      // 5. Appliquer l'état initial
      this.applyUIManagerState();
      
      this.uiManagerState.initialized = true;
      
      console.log('✅ [TeamModule] Initialisé avec succès');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 🔗 CONNEXION DES COMPOSANTS ===
  
  connectComponents() {
    // Icône → Interface (clic ouvre l'interface)
    this.icon.onClick = () => {
      if (this.canOpenTeamUI()) {
        this.ui.toggle();
      } else {
        this.showCannotOpenMessage();
      }
    };
    
    // Manager → Icône (mise à jour des stats)
    this.manager.onStatsUpdate = (stats) => {
      this.icon.updateStats(stats);
    };
    
    // Manager → Interface (mise à jour des données)
    this.manager.onTeamDataUpdate = (data) => {
      if (this.ui.isVisible) {
        this.ui.updateTeamData(data);
      }
    };
    
    // Interface → Manager (actions utilisateur)
    this.ui.onAction = (action, data) => {
      this.manager.handleAction(action, data);
    };
    
    console.log('🔗 [TeamModule] Composants connectés');
  }
  
  // === 🎛️ MÉTHODES UIMANAGER (INTERFACE PRINCIPALE) ===
  
  /**
   * UIManager appelle cette méthode pour afficher le module
   * = afficher l'icône (interface reste cachée jusqu'au clic)
   */
  show() {
    console.log('👁️ [TeamModule] show() appelé par UIManager');
    
    this.uiManagerState.visible = true;
    
    // Afficher l'icône
    if (this.icon) {
      this.icon.show();
    }
    
    // L'interface reste cachée (s'ouvre au clic)
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour cacher le module
   */
  hide() {
    console.log('👻 [TeamModule] hide() appelé par UIManager');
    
    this.uiManagerState.visible = false;
    
    // Cacher l'icône
    if (this.icon) {
      this.icon.hide();
    }
    
    // Cacher l'interface si ouverte
    if (this.ui && this.ui.isVisible) {
      this.ui.hide();
    }
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour activer/désactiver
   */
  setEnabled(enabled) {
    console.log(`🔧 [TeamModule] setEnabled(${enabled}) appelé par UIManager`);
    
    this.uiManagerState.enabled = enabled;
    
    // Appliquer aux composants
    if (this.icon) {
      this.icon.setEnabled(enabled);
    }
    
    if (this.ui) {
      this.ui.setEnabled(enabled);
    }
    
    return true;
  }
  
  /**
   * UIManager peut appeler cette méthode pour obtenir l'état
   */
  getUIManagerState() {
    return {
      ...this.uiManagerState,
      iconVisible: this.icon ? this.icon.isVisible : false,
      interfaceVisible: this.ui ? this.ui.isVisible : false,
      teamCount: this.manager ? this.manager.getTeamCount() : 0,
      canBattle: this.manager ? this.manager.canBattle() : false
    };
  }
  
  // === 🔧 GESTION ÉTAT INTERNE ===
  
  applyUIManagerState() {
    if (!this.uiManagerState.initialized) return;
    
    // Appliquer visibilité
    if (this.uiManagerState.visible) {
      this.icon?.show();
    } else {
      this.icon?.hide();
      this.ui?.hide();
    }
    
    // Appliquer état enabled
    this.icon?.setEnabled(this.uiManagerState.enabled);
    this.ui?.setEnabled(this.uiManagerState.enabled);
  }
  
  canOpenTeamUI() {
    // Vérifier si on peut ouvrir l'interface
    const blockers = [
      document.querySelector('.quest-dialog-overlay'),
      document.querySelector('#dialogue-box:not([style*="display: none"])'),
      document.querySelector('#shop-overlay:not(.hidden)')
    ];
    
    const hasBlocker = blockers.some(el => el !== null);
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    
    return !hasBlocker && !chatFocused && !inventoryOpen && this.uiManagerState.enabled;
  }
  
  showCannotOpenMessage() {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification('Cannot open team right now', 'warning', {
        duration: 2000,
        position: 'bottom-center'
      });
    }
  }
  
  // === 📊 API PUBLIQUE POUR COMPATIBILITÉ ===
  
  /**
   * Ouvrir/fermer l'interface Team (pour compatibilité)
   */
  toggleTeamUI() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  /**
   * Ouvrir l'interface Team
   */
  openTeam() {
    if (this.ui && this.canOpenTeamUI()) {
      this.ui.show();
    }
  }
  
  /**
   * Fermer l'interface Team
   */
  closeTeam() {
    if (this.ui) {
      this.ui.hide();
    }
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
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [TeamModule] Destruction...');
    
    try {
      // Détruire les composants dans l'ordre inverse
      if (this.ui) {
        this.ui.destroy();
        this.ui = null;
      }
      
      if (this.icon) {
        this.icon.destroy();
        this.icon = null;
      }
      
      if (this.manager) {
        this.manager.destroy();
        this.manager = null;
      }
      
      // Reset état
      this.uiManagerState.initialized = false;
      
      console.log('✅ [TeamModule] Destruction terminée');
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur destruction:', error);
    }
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      module: 'TeamModule',
      version: 'unified',
      uiManagerState: this.uiManagerState,
      components: {
        manager: !!this.manager,
        icon: !!this.icon,
        ui: !!this.ui
      },
      state: {
        iconVisible: this.icon?.isVisible,
        interfaceVisible: this.ui?.isVisible,
        teamCount: this.manager?.getTeamCount() || 0,
        canBattle: this.manager?.canBattle() || false
      },
      methods: {
        show: typeof this.show === 'function',
        hide: typeof this.hide === 'function',
        setEnabled: typeof this.setEnabled === 'function'
      }
    };
  }
}

// === 🏭 FACTORY POUR UIMANAGER ===

/**
 * Factory function pour créer le module Team
 * Compatible avec UIManager
 */
export async function createTeamModule(gameRoom, scene) {
  console.log('🏭 [TeamFactory] Création module Team...');
  
  try {
    const teamModule = new TeamModule(gameRoom, scene);
    await teamModule.init();
    
    console.log('✅ [TeamFactory] Module Team créé avec succès');
    return teamModule;
    
  } catch (error) {
    console.error('❌ [TeamFactory] Erreur création module Team:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POUR UIMANAGER ===

export const TEAM_MODULE_CONFIG = {
  id: 'team',
  factory: () => createTeamModule(window.currentGameRoom, window.game?.scene?.getScenes(true)[0]),
  
  defaultState: {
    visible: true,     // Icône visible par défaut
    enabled: true,     // Module activé
    initialized: false
  },
  
  priority: 100,
  critical: false,
  
  layout: {
    type: 'icon',
    anchor: 'bottom-right',
    order: 2,           // Après inventory (0) et quest (1)
    spacing: 10
  },
  
  responsive: {
    mobile: { 
      scale: 0.8,
      position: { right: '15px', bottom: '15px' }
    },
    tablet: { 
      scale: 0.9 
    },
    desktop: { 
      scale: 1.0 
    }
  },
  
  groups: ['ui-icons', 'pokemon-management'],
  
  animations: {
    show: { type: 'fadeIn', duration: 300, easing: 'ease-out' },
    hide: { type: 'fadeOut', duration: 200, easing: 'ease-in' },
    enable: { type: 'pulse', duration: 150 },
    disable: { type: 'grayscale', duration: 200 }
  },
  
  metadata: {
    name: 'Team Manager',
    description: 'Complete Pokemon team management system',
    version: '1.0.0',
    category: 'Pokemon Management'
  }
};

// === 🔗 INTÉGRATION AVEC UIMANAGER ===

/**
 * Enregistrer le module Team dans UIManager
 */
export async function registerTeamModule(uiManager) {
  console.log('📝 [TeamIntegration] Enregistrement dans UIManager...');
  
  try {
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
  console.log('🚀 [TeamIntegration] Initialisation module Team...');
  
  try {
    // Enregistrer le module
    await registerTeamModule(uiManager);
    
    // Initialiser le module
    const teamInstance = await uiManager.initializeModule('team');
    
    // Setup des raccourcis clavier
    setupTeamKeyboardShortcuts(teamInstance);
    
    // Setup des événements globaux
    setupTeamGlobalEvents(teamInstance);
    
    console.log('✅ [TeamIntegration] Module Team initialisé et connecté');
    
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === ⌨️ RACCOURCIS CLAVIER ===

function setupTeamKeyboardShortcuts(teamInstance) {
  document.addEventListener('keydown', (e) => {
    // Touche T pour ouvrir/fermer Team
    if (e.key.toLowerCase() === 't' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      e.preventDefault();
      
      if (teamInstance.canOpenTeamUI()) {
        teamInstance.toggleTeamUI();
      }
    }
  });
  
  console.log('⌨️ [TeamIntegration] Raccourcis clavier configurés (T = toggle)');
}

// === 🌐 ÉVÉNEMENTS GLOBAUX ===

function setupTeamGlobalEvents(teamInstance) {
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
  
  console.log('🌐 [TeamIntegration] Événements globaux configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Team dans un projet
 */
export async function setupTeamSystem(uiManager) {
  console.log('🎯 [TeamSetup] Configuration système Team complet...');
  
  try {
    // Initialiser le module
    const teamInstance = await initializeTeamModule(uiManager);
    
    // Exposer globalement pour compatibilité
    window.teamSystem = teamInstance;
    window.toggleTeam = () => teamInstance.toggleTeamUI();
    window.openTeam = () => teamInstance.openTeam();
    window.closeTeam = () => teamInstance.closeTeam();
    
    console.log('✅ [TeamSetup] Système Team configuré avec succès');
    console.log('🎮 Utilisez window.toggleTeam() ou touche T');
    
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default TeamModule;

console.log(`
🎯 === MODULE TEAM UNIFIÉ ===

✅ ARCHITECTURE SIMPLE:
- 1 seul module "TeamModule"
- Business logic + Icône + Interface
- Compatible UIManager

🎮 UTILISATION:
import { setupTeamSystem } from './Team/index.js';
await setupTeamSystem(uiManager);

🎛️ API UIMANAGER:
- show() → affiche l'icône
- hide() → cache tout
- setEnabled(bool) → active/désactive

🔗 API PUBLIQUE:
- toggleTeamUI() → ouvre/ferme interface
- getTeamData() → données équipe
- canBattle() → peut combattre
- healTeam() → soigne tout

⌨️ RACCOURCIS:
- Touche T → toggle interface

🌐 ÉVÉNEMENTS:
- pokemonCaught → met à jour
- battleStarted → ferme interface
- pokemonCenterEntered → refresh data

🧹 SIMPLE ET EFFICACE !
`);
