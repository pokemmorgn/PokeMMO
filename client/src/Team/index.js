// Team/index.js - Module Team Unifié pour UIManager
// 🎯 1 SEUL module qui gère TOUT : business logic + icône + interface
// ✅ MODIFIÉ: Auto-enregistrement UIManager pour positionnement intelligent

import { TeamSystem } from './TeamManager.js';
import { TeamIcon } from './TeamIcon.js';
import { TeamUI } from './TeamUI.js';

/**
 * Module Team Unifié
 * Compatible avec UIManager
 * API simple: show(), hide(), setEnabled()
 */
export class TeamModule {
  constructor(gameRoom, scene) {
    this.gameRoom = gameRoom;
    this.scene = scene;
    
    // === INSTANCES DES COMPOSANTS ===
    this.system = null;
    this.icon = null;
    this.ui = null;
    
    // === ÉTAT UIManager ===
    this.uiManagerState = {
      visible: true,        // Icône visible par défaut
      enabled: true,        // Module activé
      initialized: false    // Non encore initialisé
    };
    
    console.log('⚔️ [TeamModule] Instance créée');
  }
  
  // === 🚀 INITIALISATION ===
  
  async init() {
    try {
      console.log('🚀 [TeamModule] Initialisation...');
      
      // 1. Créer l'UI d'équipe
      this.ui = new TeamUI(this.gameRoom);
      
      // 2. Créer l'icône d'équipe  
      this.icon = new TeamIcon(this.ui);
      await this.icon.init(); // S'assurer que l'icône est créée
      
      // 3. Créer le système principal (qui orchestre)
      this.system = new TeamSystem(this.scene, this.gameRoom);
      
      // 4. Connecter les composants
      this.connectComponents();
      
      // ✅ 5. AUTO-ENREGISTREMENT DANS UIMANAGER
      this.registerWithUIManager();
      
      // 6. Appliquer l'état initial
      this.applyUIManagerState();
      
      this.uiManagerState.initialized = true;
      
      console.log('✅ [TeamModule] Initialisé avec UIManager');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // ✅ NOUVELLE MÉTHODE: Auto-enregistrement UIManager
  registerWithUIManager() {
    console.log('📍 [TeamModule] Enregistrement dans UIManager...');
    
    // Vérifier que UIManager existe
    if (!window.uiManager || !window.uiManager.registerIconPosition) {
      console.warn('⚠️ [TeamModule] UIManager non disponible pour positionnement');
      return;
    }
    
    // Vérifier que l'icône existe
    if (!this.icon || !this.icon.iconElement) {
      console.warn('⚠️ [TeamModule] IconElement non disponible pour enregistrement');
      return;
    }
    
    // Supprimer tout positionnement manuel existant
    const iconElement = this.icon.iconElement;
    iconElement.style.position = '';
    iconElement.style.right = '';
    iconElement.style.bottom = '';
    iconElement.style.left = '';
    iconElement.style.top = '';
    
    // Enregistrer dans UIManager
    window.uiManager.registerIconPosition('team', iconElement, {
      anchor: 'bottom-right',
      order: 2,               // Troisième position (plus à gauche)
      group: 'ui-icons',
      spacing: 10,
      size: { width: 70, height: 80 }
    });
    
    console.log('✅ [TeamModule] Icône enregistrée dans UIManager (ordre: 2)');
  }
  
  // === 🔗 CONNEXION DES COMPOSANTS ===
  
  connectComponents() {
    console.log('🔗 [TeamModule] Connexion des composants...');
    
    // Le système TeamSystem gère déjà les connexions
    // entre TeamIcon et TeamUI, donc pas grand chose à faire
    
    // S'assurer que les références sont correctes
    if (this.system) {
      this.system.teamUI = this.ui;
      this.system.teamIcon = this.icon;
    }
    
    // Exposer globalement pour compatibilité
    window.teamSystem = this.system;
    window.teamSystemGlobal = this; // Pour UIManager
    
    console.log('✅ [TeamModule] Composants connectés');
  }
  
  // === 🎛️ MÉTHODES UIMANAGER (INTERFACE PRINCIPALE) ===
  
  /**
   * UIManager appelle cette méthode pour afficher le module
   */
  show() {
    console.log('👁️ [TeamModule] Show appelé');
    
    this.uiManagerState.visible = true;
    
    // Afficher l'icône
    if (this.icon && this.icon.show) {
      this.icon.show();
    }
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour cacher le module
   */
  hide() {
    console.log('👻 [TeamModule] Hide appelé');
    
    this.uiManagerState.visible = false;
    
    // Cacher l'icône
    if (this.icon && this.icon.hide) {
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
    console.log(`🔧 [TeamModule] setEnabled(${enabled})`);
    
    this.uiManagerState.enabled = enabled;
    
    // Appliquer aux composants
    if (this.icon && this.icon.setEnabled) {
      this.icon.setEnabled(enabled);
    }
    
    if (this.ui && this.ui.setEnabled) {
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
      iconVisible: this.icon ? !this.icon.iconElement?.classList.contains('ui-hidden') : false,
      interfaceVisible: this.ui ? this.ui.isVisible : false,
      hasTeam: this.ui ? this.ui.teamData?.length > 0 : false,
      canOpen: this.canOpenTeam()
    };
  }
  
  // === 🔧 GESTION ÉTAT INTERNE ===
  
  applyUIManagerState() {
    if (!this.uiManagerState.initialized) return;
    
    // Appliquer visibilité
    if (this.uiManagerState.visible) {
      this.icon?.show?.();
    } else {
      this.icon?.hide?.();
      this.ui?.hide?.();
    }
    
    // Appliquer état enabled
    this.icon?.setEnabled?.(this.uiManagerState.enabled);
    this.ui?.setEnabled?.(this.uiManagerState.enabled);
  }
  
  canOpenTeam() {
    // Vérifier si on peut ouvrir l'interface
    const blockers = [
      document.querySelector('.quest-dialog-overlay'),
      document.querySelector('#dialogue-box:not([style*="display: none"])'),
      document.querySelector('#inventory-overlay:not(.hidden)')
    ];
    
    const hasBlocker = blockers.some(el => el !== null);
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    
    return !hasBlocker && !chatFocused && this.uiManagerState.enabled;
  }
  
  // === 📊 API PUBLIQUE POUR COMPATIBILITÉ ===
  
  /**
   * Ouvrir/fermer l'interface Team
   */
  toggleTeamUI() {
    if (this.ui) {
      this.ui.toggle();
    }
  }
  
  /**
   * Alias pour compatibilité
   */
  toggle() {
    this.toggleTeamUI();
  }
  
  /**
   * Ouvrir l'interface Team
   */
  openTeam() {
    if (this.ui && this.canOpenTeam()) {
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
   * Vérifier si l'équipe est ouverte
   */
  isTeamOpen() {
    return this.ui ? this.ui.isVisible : false;
  }
  
  /**
   * Gérer un Pokémon de l'équipe
   */
  managePokemon(pokemonIndex) {
    if (this.system) {
      this.system.managePokemon(pokemonIndex);
    }
  }
  
  /**
   * Changer l'ordre des Pokémon
   */
  reorderPokemon(fromIndex, toIndex) {
    if (this.system) {
      this.system.reorderPokemon(fromIndex, toIndex);
    }
  }
  
  /**
   * Utiliser un objet sur un Pokémon
   */
  useItemOnPokemon(itemId, pokemonIndex) {
    if (this.system) {
      this.system.useItemOnPokemon(itemId, pokemonIndex);
    }
  }
  
  /**
   * Demander les données d'équipe au serveur
   */
  requestTeamData() {
    if (this.system) {
      this.system.requestTeamData();
    }
  }
  
  // === 🧹 NETTOYAGE ===
  
  destroy() {
    try {
      console.log('🧹 [TeamModule] Destruction...');
      
      // Détruire les composants dans l'ordre inverse
      if (this.system && this.system.destroy) {
        this.system.destroy();
        this.system = null;
      }
      
      if (this.icon && this.icon.destroy) {
        this.icon.destroy();
        this.icon = null;
      }
      
      if (this.ui && this.ui.destroy) {
        this.ui.destroy();
        this.ui = null;
      }
      
      // Reset état
      this.uiManagerState.initialized = false;
      
      console.log('✅ [TeamModule] Détruit');
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur destruction:', error);
    }
  }
  
  // === 🐛 DEBUG ===
  
  debugInfo() {
    return {
      initialized: this.uiManagerState.initialized,
      visible: this.uiManagerState.visible,
      enabled: this.uiManagerState.enabled,
      hasSystem: !!this.system,
      hasIcon: !!this.icon,
      hasUI: !!this.ui,
      iconElement: this.icon ? !!this.icon.iconElement : false,
      uiVisible: this.ui ? this.ui.isVisible : false,
      canOpen: this.canOpenTeam(),
      registeredInUIManager: !!(window.uiManager?.registeredIcons?.has('team')),
      components: {
        system: this.system?.constructor?.name || 'none',
        icon: this.icon?.constructor?.name || 'none',
        ui: this.ui?.constructor?.name || 'none'
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
  try {
    console.log('🏭 [TeamFactory] Création module Team...');
    
    const teamModule = new TeamModule(gameRoom, scene);
    await teamModule.init();
    
    console.log('✅ [TeamFactory] Module créé avec succès');
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
  critical: true,     // Module critique (équipe est essentielle)
  
  layout: {
    type: 'icon',
    anchor: 'bottom-right',
    order: 2,           // Troisième (position la plus à gauche)
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
  try {
    await uiManager.registerModule('team', TEAM_MODULE_CONFIG);
    console.log('✅ [TeamIntegration] Module enregistré dans UIManager');
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
    // Enregistrer le module
    await registerTeamModule(uiManager);
    
    // Initialiser le module
    const teamInstance = await uiManager.initializeModule('team');
    
    // Setup des raccourcis clavier
    setupTeamKeyboardShortcuts(teamInstance);
    
    // Setup des événements globaux
    setupTeamGlobalEvents(teamInstance);
    
    console.log('✅ [TeamIntegration] Module initialisé et connecté');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === ⌨️ RACCOURCIS CLAVIER ===

function setupTeamKeyboardShortcuts(teamInstance) {
  console.log('⌨️ [TeamIntegration] Configuration raccourcis clavier...');
  
  document.addEventListener('keydown', (e) => {
    // Ne pas traiter si on ne peut pas interagir
    if (!teamInstance.canOpenTeam()) return;
    
    // Touche T pour ouvrir/fermer Team
    if (e.key.toLowerCase() === 't' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      e.preventDefault();
      teamInstance.toggleTeamUI();
    }
    
    // Touche P pour ouvrir directement l'équipe (Pokemon)
    if (e.key.toLowerCase() === 'p' && 
        !e.target.matches('input, textarea, [contenteditable]') &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      
      e.preventDefault();
      teamInstance.openTeam();
    }
  });
  
  console.log('✅ [TeamIntegration] Raccourcis configurés (T, P)');
}

// === 🌐 ÉVÉNEMENTS GLOBAUX ===

function setupTeamGlobalEvents(teamInstance) {
  console.log('🌐 [TeamIntegration] Configuration événements globaux...');
  
  // Événement: Pokémon capturé
  window.addEventListener('pokemonCaptured', (event) => {
    if (teamInstance.system) {
      teamInstance.system.onPokemonCaptured(event.detail.pokemon);
    }
  });
  
  // Événement: Combat commencé
  window.addEventListener('battleStarted', () => {
    if (teamInstance.ui && teamInstance.ui.isVisible) {
      teamInstance.ui.hide();
    }
  });
  
  // Événement: Pokémon évolution
  window.addEventListener('pokemonEvolved', (event) => {
    if (teamInstance.system) {
      teamInstance.system.onPokemonEvolved(event.detail.pokemon);
    }
  });
  
  // Événement: Entrée dans un Centre Pokémon
  window.addEventListener('pokemonCenterEntered', () => {
    if (teamInstance.system) {
      teamInstance.requestTeamData(); // Refresh data
    }
  });
  
  // Événement: Équipe pleine
  window.addEventListener('teamFull', (event) => {
    if (teamInstance.system) {
      teamInstance.system.onTeamFull(event.detail.pokemon);
    }
  });
  
  console.log('✅ [TeamIntegration] Événements globaux configurés');
}

// === 💡 UTILISATION SIMPLE ===

/**
 * Fonction d'utilisation simple pour intégrer Team dans un projet
 */
export async function setupTeamSystem(uiManager) {
  try {
    // Initialiser le module
    const teamInstance = await initializeTeamModule(uiManager);
    
    // Exposer globalement pour compatibilité
    window.teamSystem = teamInstance.system;
    window.teamSystemGlobal = teamInstance;
    window.toggleTeam = () => teamInstance.toggleTeamUI();
    window.openTeam = () => teamInstance.openTeam();
    window.closeTeam = () => teamInstance.closeTeam();
    
    console.log('✅ [TeamSetup] Système Team configuré et exposé globalement');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default TeamModule;

console.log(`
⚔️ === MODULE TEAM UNIFIÉ AVEC UIMANAGER ===

✅ ARCHITECTURE:
• TeamModule → Orchestrateur UIManager
• TeamSystem → Business logic existante
• TeamIcon → Icône UI existante
• TeamUI → Interface existante

🎛️ API UIMANAGER:
• show() → Affiche l'icône
• hide() → Cache l'icône + interface
• setEnabled(bool) → Active/désactive
• getUIManagerState() → État complet

📍 POSITIONNEMENT AUTOMATIQUE:
• registerWithUIManager() → Auto-enregistrement
• Position bottom-right calculée automatiquement
• Ordre 2 = position la plus à gauche
• Espacement 10px avec autres icônes

📦 API PUBLIQUE:
• toggleTeamUI() → Ouvre/ferme l'interface
• openTeam() → Ouvre l'équipe
• managePokemon(index) → Gère un Pokémon
• reorderPokemon(from, to) → Réorganise

⌨️ RACCOURCIS:
• T → Toggle équipe
• P → Ouvre équipe

🔗 INTÉGRATION:
• Compatible avec InventoryModule
• Position order: 2 (plus à gauche)
• Responsive automatique
• Événements globaux

🎯 PRÊT POUR UIMANAGER AVEC POSITIONNEMENT !
`);
