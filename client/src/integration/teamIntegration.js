// client/src/integration/teamIntegration.js - VERSION CORRIGÉE AVEC TEAMICON
// ✅ Intégration complète TeamUI + TeamIcon

import TeamManager from '../managers/TeamManager.js';
import { TeamUI } from '../components/TeamUI.js';
import { TeamIcon } from '../components/TeamIcon.js';

/**
 * Initialise et intègre le système d'équipe dans le jeu principal
 * À appeler depuis votre fichier main du jeu après la connexion à la room
 */
export function setupTeamSystem(gameRoom) {
  console.log('🔧 Configuration du système d\'équipe...');
  
  try {
    // ✅ 1. CRÉER TEAMUI D'ABORD
    console.log('⚔️ Création de TeamUI...');
    const teamUI = new TeamUI(gameRoom);
    
    // ✅ 2. CRÉER TEAMICON ET LA CONNECTER À TEAMUI
    console.log('🎯 Création de TeamIcon...');
    const teamIcon = new TeamIcon(teamUI);
    
    // ✅ 3. CONNECTER TEAMUI À TEAMICON (BIDIRECTIONNEL)
    console.log('🔗 Connexion bidirectionnelle...');
    teamUI.setTeamIcon(teamIcon);
    
    // ✅ 4. CRÉER TEAMMANAGER AVEC LES COMPOSANTS CONNECTÉS
    console.log('🎮 Création de TeamManager...');
    const teamManager = new TeamManager(null, gameRoom);
    
    // ✅ 5. INTÉGRER LES COMPOSANTS DANS LE TEAMMANAGER
    if (teamManager) {
      teamManager.teamUI = teamUI;
      teamManager.teamIcon = teamIcon;
      
      // Marquer comme initialisé
      teamManager.isInitialized = true;
      
      console.log('✅ TeamManager configuré avec TeamUI et TeamIcon');
    }
    
    // ✅ 6. EXPOSER GLOBALEMENT
    window.teamSystem = teamManager;
    window.TeamManager = teamManager;
    window.teamManagerGlobal = teamManager;
    window.teamUI = teamUI;
    window.teamIcon = teamIcon;
    
    // ✅ 7. INTÉGRATIONS ET ÉVÉNEMENTS
    integrateWithExistingSystems(teamManager);
    setupGlobalTeamEvents(teamManager);
    
    console.log('✅ Système d\'équipe configuré avec succès');
    console.log('📊 Components créés:', {
      teamManager: !!teamManager,
      teamUI: !!teamUI,
      teamIcon: !!teamIcon,
      connected: teamUI.teamIcon === teamIcon
    });
    
    return teamManager;
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration du système d\'équipe:', error);
    throw error;
  }
}

/**
 * Alternative : Setup simple sans TeamManager
 * Si vous voulez juste TeamUI + TeamIcon sans le wrapper TeamManager
 */
export function setupSimpleTeamSystem(gameRoom) {
  console.log('🔧 Configuration simple du système d\'équipe...');
  
  try {
    // Créer TeamUI
    const teamUI = new TeamUI(gameRoom);
    
    // Créer TeamIcon
    const teamIcon = new TeamIcon(teamUI);
    
    // Connecter
    teamUI.setTeamIcon(teamIcon);
    
    // Exposer
    window.teamUI = teamUI;
    window.teamIcon = teamIcon;
    
    // Créer un objet simple comme manager
    const simpleManager = {
      teamUI,
      teamIcon,
      isInitialized: true,
      gameRoom,
      
      // Méthodes de convenance
      toggleTeamUI: () => teamUI.toggle(),
      openTeamUI: () => teamUI.show(),
      closeTeamUI: () => teamUI.hide(),
      isOpen: () => teamUI.isOpen(),
      canPlayerInteract: () => teamUI.canPlayerInteract(),
      
      // Nettoyage
      destroy: () => {
        teamUI.destroy();
        teamIcon.destroy();
      }
    };
    
    window.teamManagerGlobal = simpleManager;
    
    console.log('✅ Système d\'équipe simple configuré');
    return simpleManager;
    
  } catch (error) {
    console.error('❌ Erreur configuration simple:', error);
    throw error;
  }
}

/**
 * Intègre le système d'équipe avec les systèmes existants
 */
function integrateWithExistingSystems(teamManager) {
  
  // === INTÉGRATION AVEC LE SYSTÈME D'INVENTAIRE ===
  if (window.InventoryUI) {
    console.log('🔗 Intégration avec InventoryUI...');
    
    // Écouter les événements d'utilisation d'objets de soin
    document.addEventListener('inventory:itemUsed', (event) => {
      const { itemId, context, target } = event.detail;
      
      if (context === 'pokemon' && target) {
        // L'objet a été utilisé sur un Pokémon
        if (isHealingItem(itemId)) {
          if (teamManager.teamUI) {
            teamManager.teamUI.requestTeamData(); // Rafraîchir l'équipe
          }
        }
      }
    });
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE QUÊTES ===
  if (window.QuestSystem) {
    console.log('🔗 Intégration avec QuestSystem...');
    
    // ✅ ÉVÉNEMENTS DIRECTS AU LIEU DE CALLBACKS COMPLEXES
    if (teamManager.gameRoom) {
      teamManager.gameRoom.onMessage("pokemonAddedToTeam", (data) => {
        window.QuestSystem.checkProgress('catch_pokemon', data.pokemon);
        
        // Animation sur l'icône
        if (teamManager.teamIcon) {
          teamManager.teamIcon.onPokemonAdded(data.pokemon);
        }
      });
    }
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE CHAT ===
  if (window.ChatSystem) {
    console.log('🔗 Intégration avec ChatSystem...');
    
    // Commandes de chat pour l'équipe
    window.ChatSystem.addCommand('team', () => {
      if (teamManager.teamUI && teamManager.teamUI.canPlayerInteract()) {
        teamManager.teamUI.toggle();
      } else {
        window.ChatSystem.addMessage('System', 'Cannot open team right now');
      }
    });
    
    window.ChatSystem.addCommand('heal', () => {
      if (teamManager.teamUI) {
        teamManager.teamUI.healTeam();
      }
    });
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE COMBAT ===
  if (window.BattleSystem) {
    console.log('🔗 Intégration avec BattleSystem...');
    
    // Hook pour les animations de combat
    const originalStartBattle = window.BattleSystem.startBattle;
    window.BattleSystem.startBattle = function(...args) {
      // Animation de début de combat sur l'icône
      if (teamManager.teamIcon) {
        teamManager.teamIcon.onBattleStart();
      }
      
      return originalStartBattle.apply(this, args);
    };
    
    const originalEndBattle = window.BattleSystem.endBattle;
    window.BattleSystem.endBattle = function(...args) {
      // Animation de fin de combat sur l'icône
      if (teamManager.teamIcon) {
        teamManager.teamIcon.onBattleEnd();
      }
      
      return originalEndBattle.apply(this, args);
    };
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE SAUVEGARDE ===
  if (window.SaveSystem) {
    console.log('🔗 Intégration avec SaveSystem...');
    
    // Ajouter les données d'équipe à la sauvegarde
    const originalExportData = window.SaveSystem.exportData;
    window.SaveSystem.exportData = function() {
      const data = originalExportData.call(this);
      if (teamManager.teamUI) {
        data.team = teamManager.teamUI.exportData();
      }
      return data;
    };
    
    const originalImportData = window.SaveSystem.importData;
    window.SaveSystem.importData = function(data) {
      originalImportData.call(this, data);
      if (data.team && teamManager.teamUI) {
        teamManager.teamUI.importData(data.team);
        teamManager.teamUI.requestTeamData();
      }
    };
  }
  
  console.log('✅ Intégrations terminées');
}

/**
 * Configure les événements globaux pour le système d'équipe
 */
function setupGlobalTeamEvents(teamManager) {
  
  // === ÉVÉNEMENTS DE FENÊTRE ===
  
  // Fermer l'équipe lors du redimensionnement pour éviter les problèmes d'affichage
  window.addEventListener('resize', () => {
    if (window.innerWidth < 768 && teamManager.teamUI?.isOpen()) {
      // Sur mobile, fermer l'équipe lors de changements d'orientation
      teamManager.teamUI.hide();
    }
  });
  
  // Gestion de la visibilité de la page
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && teamManager.teamUI?.isOpen()) {
      // Fermer l'équipe quand l'onglet devient invisible
      teamManager.teamUI.hide();
    }
  });
  
  // === ÉVÉNEMENTS CLAVIER GLOBAUX ===
  
  document.addEventListener('keydown', (e) => {
    // Raccourcis spéciaux avec Ctrl/Cmd
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      if (teamManager.teamUI) {
        teamManager.teamUI.toggle();
      }
    }
    
    // Déléguer les raccourcis à TeamUI si elle est ouverte
    if (teamManager.teamUI && teamManager.teamUI.isOpen()) {
      const handled = teamManager.teamUI.handleKeyPress(e.key);
      if (handled) {
        e.preventDefault();
      }
    }
  });
  
  // === ÉVÉNEMENTS PERSONNALISÉS ===
  
  // Écouter les messages du serveur pour déclencher des événements
  if (teamManager.gameRoom) {
    teamManager.gameRoom.onMessage("pokemonAddedToTeam", (pokemon) => {
      document.dispatchEvent(new CustomEvent('game:pokemonAddedToTeam', {
        detail: pokemon
      }));
      
      // Notification sur l'icône
      if (teamManager.teamIcon) {
        teamManager.teamIcon.onPokemonAdded(pokemon);
      }
    });
    
    teamManager.gameRoom.onMessage("pokemonRemovedFromTeam", (data) => {
      document.dispatchEvent(new CustomEvent('game:pokemonRemovedFromTeam', {
        detail: data
      }));
      
      // Notification sur l'icône
      if (teamManager.teamIcon) {
        teamManager.teamIcon.onPokemonRemoved();
      }
    });
    
    teamManager.gameRoom.onMessage("pokemonFainted", (data) => {
      // Animation spéciale pour KO
      if (teamManager.teamIcon) {
        teamManager.teamIcon.onPokemonFainted();
      }
    });
  }
  
  console.log('✅ Événements globaux configurés');
}

/**
 * Vérifie si un objet est un objet de soin
 */
function isHealingItem(itemId) {
  const healingItems = [
    'potion', 'super_potion', 'hyper_potion', 'max_potion', 'full_restore',
    'revive', 'max_revive', 'antidote', 'parlyz_heal', 'awakening', 
    'burn_heal', 'ice_heal', 'full_heal'
  ];
  return healingItems.includes(itemId);
}

/**
 * Configuration des raccourcis clavier personnalisables
 */
function setupCustomKeybinds(keybinds = {}) {
  const defaultKeybinds = {
    toggleTeam: 't',
    healTeam: 'h',
    selectSlot1: '1',
    selectSlot2: '2',
    selectSlot3: '3',
    selectSlot4: '4',
    selectSlot5: '5',
    selectSlot6: '6'
  };
  
  const finalKeybinds = { ...defaultKeybinds, ...keybinds };
  
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) {
      return; // Ignorer si dans un champ de saisie
    }
    
    const key = e.key.toLowerCase();
    const teamManager = window.teamManagerGlobal;
    
    if (!teamManager || !teamManager.teamUI) return;
    
    switch (key) {
      case finalKeybinds.toggleTeam:
        e.preventDefault();
        teamManager.teamUI.toggle();
        break;
        
      case finalKeybinds.healTeam:
        if (teamManager.teamUI.isOpen()) {
          e.preventDefault();
          teamManager.teamUI.healTeam();
        }
        break;
        
      case finalKeybinds.selectSlot1:
      case finalKeybinds.selectSlot2:
      case finalKeybinds.selectSlot3:
      case finalKeybinds.selectSlot4:
      case finalKeybinds.selectSlot5:
      case finalKeybinds.selectSlot6:
        if (teamManager.teamUI.isOpen()) {
          e.preventDefault();
          const slot = parseInt(key) - 1;
          if (teamManager.teamUI.selectPokemonBySlot) {
            teamManager.teamUI.selectPokemonBySlot(slot);
          }
        }
        break;
    }
  });
  
  console.log('⌨️ Raccourcis clavier configurés:', finalKeybinds);
}

/**
 * Fonctions utilitaires pour l'intégration
 */
const TeamIntegrationUtils = {
  
  /**
   * Vérifie si le système d'équipe est prêt
   */
  isTeamSystemReady() {
    return !!(window.teamManagerGlobal && window.teamUI && window.teamIcon);
  },
  
  /**
   * Obtient les statistiques actuelles de l'équipe
   */
  getCurrentTeamStats() {
    if (window.teamUI && window.teamUI.teamData) {
      const teamData = window.teamUI.teamData;
      return {
        totalPokemon: teamData.length,
        alivePokemon: teamData.filter(p => p.currentHp > 0).length,
        canBattle: teamData.some(p => p.currentHp > 0)
      };
    }
    return null;
  },
  
  /**
   * Force une synchronisation des données d'équipe
   */
  syncTeamData() {
    if (window.teamUI) {
      window.teamUI.requestTeamData();
    }
  },
  
  /**
   * Vérifie si un combat peut commencer
   */
  canStartBattle() {
    const stats = this.getCurrentTeamStats();
    return stats ? stats.canBattle : false;
  },
  
  /**
   * Obtient le Pokémon le plus fort de l'équipe
   */
  getStrongestPokemon() {
    if (!window.teamUI || !window.teamUI.teamData) return null;
    
    const alivePokemon = window.teamUI.teamData.filter(p => p.currentHp > 0);
    if (alivePokemon.length === 0) return null;
    
    return alivePokemon.reduce((strongest, current) => {
      const strongestPower = calculatePokemonPower(strongest);
      const currentPower = calculatePokemonPower(current);
      return currentPower > strongestPower ? current : strongest;
    });
  },
  
  /**
   * Notifications rapides pour l'équipe
   */
  showTeamNotification(message, type = 'info') {
    if (window.teamUI) {
      window.teamUI.showNotification(message, type);
    }
  },
  
  /**
   * Debug du système d'équipe
   */
  debugTeamSystem() {
    console.log('🔍 === DEBUG TEAM SYSTEM ===');
    console.log('TeamManager Global:', !!window.teamManagerGlobal);
    console.log('TeamUI:', !!window.teamUI);
    console.log('TeamIcon:', !!window.teamIcon);
    console.log('Team Icon DOM:', !!document.querySelector('#team-icon'));
    console.log('TeamUI connected to icon:', window.teamUI?.teamIcon === window.teamIcon);
    console.log('TeamIcon connected to UI:', window.teamIcon?.teamUI === window.teamUI);
    
    if (window.teamUI) {
      console.log('Team Data:', window.teamUI.teamData.length, 'pokemon');
      console.log('UI Open:', window.teamUI.isOpen());
    }
    
    return this.getCurrentTeamStats();
  }
};

/**
 * Fonctions utilitaires internes
 */
function calculatePokemonPower(pokemon) {
  if (!pokemon || !pokemon.calculatedStats) return 0;
  
  const stats = pokemon.calculatedStats;
  return (stats.attack + stats.spAttack + stats.defense + stats.spDefense + stats.speed) * (pokemon.level / 100);
}

// Export par défaut
export default {
  setup: setupTeamSystem,
  setupSimple: setupSimpleTeamSystem,
  utils: TeamIntegrationUtils,
  keybinds: setupCustomKeybinds
};
