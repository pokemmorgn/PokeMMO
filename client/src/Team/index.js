// Team/index.js - Module Team Unifié CORRIGÉ avec Singleton
// 🎯 ÉVITE LA DOUBLE INITIALISATION avec pattern Singleton
// 📍 INTÉGRÉ avec UIManager pour positionnement automatique

import { TeamManager } from './TeamManager.js';
import { TeamIcon } from './TeamIcon.js';
import { TeamUI } from './TeamUI.js';
console.trace('🔍 TEAM MODULE CHARGÉ - Trace:');
/**
 * Module Team Unifié avec Singleton Pattern
 * Compatible avec UIManager simplifié
 * API simple: show(), hide(), setEnabled()
 */
export class TeamModule {
  constructor(gameRoom, scene) {
    // 🆕 SINGLETON PATTERN - ÉVITER DOUBLE INITIALISATION
    if (TeamModule.instance) {
      console.log('♻️ [TeamModule] Instance existante détectée, réutilisation');
      return TeamModule.instance;
    }
    
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
    
    // 🆕 SINGLETON - STOCKER L'INSTANCE
    TeamModule.instance = this;
    
    console.log('⚔️ [TeamModule] Nouvelle instance créée (singleton)');
  }
  
  // 🆕 MÉTHODES STATIQUES SINGLETON
  static getInstance() {
    return TeamModule.instance || null;
  }
  
  static reset() {
    if (TeamModule.instance) {
      TeamModule.instance.destroy();
      TeamModule.instance = null;
    }
  }
  
  static hasInstance() {
    return TeamModule.instance !== null;
  }
  
  // === 🚀 INITIALISATION PROTÉGÉE ===
  
  async init() {
    try {
      // 🆕 ÉVITER DOUBLE INITIALISATION
      if (this.uiManagerState.initialized) {
        console.log('ℹ️ [TeamModule] Déjà initialisé, retour instance existante');
        return this;
      }
      
      console.log('🚀 [TeamModule] Initialisation (singleton protection)...');
      
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
      
      // 🆕 5. MARQUER COMME INITIALISÉ (PROTECTION)
      this.uiManagerState.initialized = true;
      
      // 🆕 6. FERMER L'UI PAR DÉFAUT (éviter ouverture automatique)
      this.forceCloseUI();
      
      console.log('✅ [TeamModule] Initialisé avec protection singleton');
      return this;
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur initialisation:', error);
      throw error;
    }
  }
  
  // === 📍 CONNEXION UIMANAGER SÉCURISÉE ===
  
  connectUIManager(uiManager) {
    console.log('📍 [TeamModule] Connexion UIManager SÉCURISÉE...');
    
    if (!uiManager || !uiManager.registerIconPosition) {
      console.warn('⚠️ [TeamModule] UIManager incompatible');
      return false;
    }
    
    if (!this.icon || !this.icon.iconElement) {
      console.warn('⚠️ [TeamModule] Icône non disponible pour UIManager');
      return false;
    }
    
    // 🆕 VÉRIFIER SI DÉJÀ CONNECTÉ (éviter double connexion)
    if (this.icon.iconElement.hasAttribute('data-positioned-by-uimanager')) {
      console.log('ℹ️ [TeamModule] Déjà connecté à UIManager, skip');
      return true;
    }
    
    // Configuration pour UIManager
    const iconConfig = {
      anchor: 'bottom-right',
      order: 2,           // Après inventory (0) et quest (1)
      group: 'ui-icons',
      spacing: 10,
      size: { width: 70, height: 80 }
    };
    
    try {
      // Enregistrer l'icône pour positionnement automatique
      uiManager.registerIconPosition('team', this.icon.iconElement, iconConfig);
      
      // 🆕 MARQUER COMME CONNECTÉ
      this.icon.iconElement.setAttribute('data-positioned-by-uimanager', 'true');
      
      console.log('✅ [TeamModule] Connecté à UIManager avec succès');
      return true;
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur connexion UIManager:', error);
      return false;
    }
  }
  
  // 🆕 MÉTHODE POUR ASSURER LA CRÉATION D'ICÔNE
  ensureIconForUIManager() {
    console.log('🔧 [TeamModule] Vérification icône pour UIManager...');
    
    if (!this.icon) {
      console.log('🆕 [TeamModule] Création icône manquante...');
      this.icon = new TeamIcon(this.manager);
      this.icon.init();
      
      // Reconnecter les événements
      this.connectComponents();
    }
    
    if (!this.icon.iconElement) {
      console.warn('❌ [TeamModule] Impossible de créer iconElement');
      return false;
    }
    
    // Reset l'état de positionnement
    this.icon.iconElement.removeAttribute('data-positioned-by-uimanager');
    
    console.log('✅ [TeamModule] Icône prête pour UIManager');
    return true;
  }
  
  // 🆕 MÉTHODE POUR FORCER FERMETURE UI
  forceCloseUI() {
    console.log('🔒 [TeamModule] Force fermeture UI...');
    
    try {
      // Méthode 1: Via le module UI
      if (this.ui && this.ui.hide) {
        this.ui.hide();
        console.log('  ✅ UI fermée via module');
      }
      
      // Méthode 2: Fermeture brutale overlay
      const teamOverlay = document.querySelector('#team-overlay');
      if (teamOverlay) {
        teamOverlay.classList.add('hidden');
        teamOverlay.style.display = 'none';
        teamOverlay.style.opacity = '0';
        teamOverlay.style.pointerEvents = 'none';
        console.log('  ✅ Overlay fermé brutalement');
      }
      
      // Méthode 3: Tous les éléments team potentiels
      const teamElements = document.querySelectorAll(
        '.team-overlay, .team-modal, .team-interface, [id*="team-"]'
      );
      teamElements.forEach(el => {
        if (el.style) {
          el.style.display = 'none';
        }
      });
      
      if (teamElements.length > 0) {
        console.log(`  ✅ ${teamElements.length} éléments Team fermés`);
      }
      
      // 🆕 Marquer UI comme fermée
      if (this.ui) {
        this.ui.isVisible = false;
      }
      
      console.log('✅ [TeamModule] UI fermée avec succès (force)');
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur force fermeture:', error);
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
      this.ui.updateTeamData(data);
      
      // Si l'UI est visible, forcer un refresh
      if (this.ui.isVisible) {
        setTimeout(() => {
          this.ui.refreshCompleteDisplay();
          this.ui.updateCompleteStats();
        }, 100);
      }
    };
    
    // Interface → Manager (actions utilisateur)
    this.ui.onAction = (action, data) => {
      this.manager.handleAction(action, data);
    };
  }
  
  // === 🎛️ MÉTHODES UIMANAGER (INTERFACE PRINCIPALE) ===
  
  /**
   * UIManager appelle cette méthode pour afficher le module
   */
  show() {
    this.uiManagerState.visible = true;
    
    // Afficher l'icône
    if (this.icon) {
      this.icon.show();
    }
    
    // Demander une mise à jour des données
    if (this.manager) {
      setTimeout(() => {
        this.manager.requestTeamData();
      }, 200);
    }
    
    return true;
  }
  
  /**
   * UIManager appelle cette méthode pour cacher le module
   */
  hide() {
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
      canBattle: this.manager ? this.manager.canBattle() : false,
      singleton: true,
      instanceId: this.constructor.name + '_' + (this.gameRoom?.id || 'unknown')
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
   * Ouvrir/fermer l'interface Team
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
  
  // === 🧹 NETTOYAGE SINGLETON ===
  
  destroy() {
    try {
      console.log('🧹 [TeamModule] Destruction avec nettoyage singleton...');
      
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
      
      // 🆕 RESET SINGLETON
      if (TeamModule.instance === this) {
        TeamModule.instance = null;
        console.log('🧹 [TeamModule] Singleton reseté');
      }
      
      console.log('✅ [TeamModule] Destruction terminée');
      
    } catch (error) {
      console.error('❌ [TeamModule] Erreur destruction:', error);
    }
  }
}

// 🆕 VARIABLE STATIQUE POUR SINGLETON
TeamModule.instance = null;

// === 🏭 FACTORY CORRIGÉE AVEC GESTION UIMANAGER ===

/**
 * Factory function pour créer le module Team
 * Compatible avec UIManager et Singleton
 */
export async function createTeamModule(gameRoom, scene) {
  try {
    console.log('🏭 [TeamFactory] Création/récupération module Team...');
    
    // 🆕 VÉRIFIER SI INSTANCE SINGLETON EXISTE
    let existingInstance = TeamModule.getInstance();
    
    if (existingInstance && existingInstance.uiManagerState.initialized) {
      console.log('♻️ [TeamFactory] Instance singleton trouvée, préparation pour UIManager...');
      
      // 🆕 FERMER L'UI SI ELLE EST OUVERTE (éviter conflit)
      existingInstance.forceCloseUI();
      
      // 🆕 ASSURER QUE L'ICÔNE EST DISPONIBLE POUR UIMANAGER
      if (existingInstance.icon && existingInstance.icon.iconElement) {
        console.log('✅ [TeamFactory] Icône disponible pour UIManager');
        
        // Réinitialiser l'état de positionnement pour UIManager
        existingInstance.icon.iconElement.removeAttribute('data-positioned-by-uimanager');
        
        // Vérifier la compatibilité gameRoom
        if (existingInstance.gameRoom !== gameRoom) {
          console.log('🔄 [TeamFactory] GameRoom différent, mise à jour...');
          existingInstance.gameRoom = gameRoom;
          existingInstance.scene = scene;
          
          // Reconnecter le manager si nécessaire
          if (existingInstance.manager) {
            existingInstance.manager.gameRoom = gameRoom;
          }
        }
        
        return existingInstance;
      } else {
        console.warn('⚠️ [TeamFactory] Instance sans icône, recréation...');
        // Reset singleton si icône manquante
        TeamModule.reset();
      }
    }
    
    // 🆕 CRÉER NOUVELLE INSTANCE
    console.log('🆕 [TeamFactory] Création nouvelle instance singleton...');
    const teamModule = new TeamModule(gameRoom, scene);
    await teamModule.init();
    
    console.log('✅ [TeamFactory] Module Team créé avec succès (singleton)');
    return teamModule;
    
  } catch (error) {
    console.error('❌ [TeamFactory] Erreur création module Team:', error);
    throw error;
  }
}

// === 📋 CONFIGURATION POUR UIMANAGER MISE À JOUR ===

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
    description: 'Complete Pokemon team management system (Singleton)',
    version: '1.1.1',
    category: 'Pokemon Management',
    singleton: true
  }
};

// === 🔗 INTÉGRATION AVEC UIMANAGER AMÉLIORÉE ===

/**
 * Enregistrer le module Team dans UIManager avec protection singleton
 */
export async function registerTeamModule(uiManager) {
  try {
    console.log('📝 [TeamIntegration] Enregistrement avec protection singleton...');
    
    // 🆕 VÉRIFIER SI DÉJÀ ENREGISTRÉ
    if (uiManager.modules && uiManager.modules.has('team')) {
      console.log('ℹ️ [TeamIntegration] Module déjà enregistré');
      return true;
    }
    
    await uiManager.registerModule('team', TEAM_MODULE_CONFIG);
    console.log('✅ [TeamIntegration] Module enregistré');
    
    return true;
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur enregistrement:', error);
    throw error;
  }
}

/**
 * Initialiser et connecter le module Team avec protection
 */
export async function initializeTeamModule(uiManager) {
  try {
    console.log('🚀 [TeamIntegration] Initialisation avec protection...');
    
    // Enregistrer le module
    await registerTeamModule(uiManager);
    
    // 🆕 VÉRIFIER SI DÉJÀ INITIALISÉ
    let teamInstance = TeamModule.getInstance();
    
    if (!teamInstance || !teamInstance.uiManagerState.initialized) {
      // Initialiser le module
      teamInstance = await uiManager.initializeModule('team');
    } else {
      console.log('ℹ️ [TeamIntegration] Instance déjà initialisée');
      
      // Connecter à UIManager si pas encore fait
      if (teamInstance.connectUIManager) {
        teamInstance.connectUIManager(uiManager);
      }
    }
    
    // Setup des raccourcis clavier
    setupTeamKeyboardShortcuts(teamInstance);
    
    // Setup des événements globaux
    setupTeamGlobalEvents(teamInstance);
    
    console.log('✅ [TeamIntegration] Initialisation terminée');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamIntegration] Erreur initialisation:', error);
    throw error;
  }
}

// === ⌨️ RACCOURCIS CLAVIER ===

function setupTeamKeyboardShortcuts(teamInstance) {
  // Éviter double setup
  if (window._teamKeyboardSetup) {
    console.log('ℹ️ [TeamKeyboard] Raccourcis déjà configurés');
    return;
  }
  
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
  
  window._teamKeyboardSetup = true;
  console.log('⌨️ [TeamKeyboard] Raccourcis configurés');
}

// === 🌐 ÉVÉNEMENTS GLOBAUX ===

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
  console.log('🌐 [TeamEvents] Événements configurés');
}

// === 💡 UTILISATION SIMPLE MISE À JOUR ===

/**
 * Fonction d'utilisation simple pour intégrer Team dans un projet
 */
export async function setupTeamSystem(uiManager) {
  try {
    console.log('🔧 [TeamSetup] Configuration système Team...');
    
    // Initialiser le module
    const teamInstance = await initializeTeamModule(uiManager);
    
    // Exposer globalement pour compatibilité (éviter double)
    if (!window.teamSystem) {
      window.teamSystem = teamInstance;
      window.teamSystemGlobal = teamInstance;
      window.toggleTeam = () => teamInstance.toggleTeamUI();
      window.openTeam = () => teamInstance.openTeam();
      window.closeTeam = () => teamInstance.closeTeam();
      
      // 🆕 FONCTION DE FORCE FERMETURE
      window.forceCloseTeam = () => teamInstance.forceCloseUI();
      
      console.log('🌐 [TeamSetup] Fonctions globales exposées');
    }
    
    console.log('✅ [TeamSetup] Système Team configuré (singleton)');
    return teamInstance;
    
  } catch (error) {
    console.error('❌ [TeamSetup] Erreur configuration:', error);
    throw error;
  }
}

// === 📋 EXPORT PAR DÉFAUT ===

export default TeamModule;

// === 🔍 UTILITÉS DE DEBUG SINGLETON ===

export function debugTeamSingleton() {
  const instance = TeamModule.getInstance();
  
  const info = {
    hasSingleton: !!instance,
    isInitialized: instance ? instance.uiManagerState.initialized : false,
    hasIcon: instance ? !!instance.icon : false,
    hasUI: instance ? !!instance.ui : false,
    uiVisible: instance ? instance.ui?.isVisible : false,
    iconVisible: instance ? instance.icon?.isVisible : false,
    gameRoom: instance ? !!instance.gameRoom : false,
    
    state: instance ? instance.getUIManagerState() : null,
    
    solutions: instance ? [
      '✅ Singleton OK - utilisez forceCloseUI()',
      '🔒 window.forceCloseTeam() pour fermer UI',
      '🔄 window.teamSystemGlobal pour accès direct'
    ] : [
      '🚀 Créez avec createTeamModule()',
      '🔧 Initialisez avec setupTeamSystem()'
    ]
  };
  
  console.log('🔍 === DEBUG TEAM SINGLETON ===');
  console.table(info);
  
  if (instance && instance.ui?.isVisible) {
    console.log('💡 SOLUTION: UI ouverte - utilisez forceCloseUI()');
    console.log('🔒 Commande: window.teamSystemGlobal.forceCloseUI()');
  }
  
  return info;
}

// === 🔧 FONCTION DE RÉPARATION ===

export function fixTeamModule() {
  console.log('🔧 [TeamFix] Réparation module Team...');
  
  try {
    const instance = TeamModule.getInstance();
    
    if (instance) {
      // Force fermeture UI
      instance.forceCloseUI();
      
      // Réinitialiser état si nécessaire
      if (instance.ui) {
        instance.ui.isVisible = false;
      }
      
      console.log('✅ [TeamFix] Module réparé');
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

console.log(`
⚔️ === TEAM MODULE SINGLETON CORRIGÉ ===

🆕 NOUVELLES FONCTIONNALITÉS:
• Singleton Pattern - évite double initialisation
• forceCloseUI() - fermeture forcée de l'interface
• Protection UIManager - connexion sécurisée
• État persistant - réutilise instance existante

📍 INTÉGRATION UIMANAGER:
• connectUIManager() sécurisé
• Position: bottom-right, order: 2
• Protection double connexion

🔧 FONCTIONS DE DEBUG:
• debugTeamSingleton() - diagnostique complet
• fixTeamModule() - réparation automatique
• TeamModule.getInstance() - accès singleton

🔒 RÉSOLUTION PROBLÈME:
• Plus de double initialisation
• UI fermée par défaut
• Force fermeture disponible

🎯 COMMANDES UTILES:
• window.forceCloseTeam() - fermer UI
• window.teamSystemGlobal.forceCloseUI() - force
• debugTeamSingleton() - debug
• fixTeamModule() - réparer

✅ PROBLÈME DOUBLE INITIALISATION RÉSOLU !
`);
