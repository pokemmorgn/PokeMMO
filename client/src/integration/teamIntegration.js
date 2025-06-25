// client/src/integration/teamIntegration.js - Intégration du système d'équipe

import { initializeTeamSystem } from '../managers/TeamManager.js';

/**
 * Initialise et intègre le système d'équipe dans le jeu principal
 * À appeler depuis votre fichier main du jeu après la connexion à la room
 */
export function setupTeamSystem(gameRoom) {
  console.log('🔧 Configuration du système d\'équipe...');
  
  try {
    // Initialiser le TeamManager
    const teamManager = initializeTeamSystem(gameRoom);
    
    // Intégrer avec les autres systèmes existants
    integrateWithExistingSystems(teamManager);
    
    // Configurer les événements globaux
    setupGlobalTeamEvents(teamManager);
    
    console.log('✅ Système d\'équipe configuré avec succès');
    return teamManager;
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration du système d\'équipe:', error);
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
          teamManager.requestTeamData(); // Rafraîchir l'équipe
        }
      }
    });
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE QUÊTES ===
  if (window.QuestSystem) {
    console.log('🔗 Intégration avec QuestSystem...');
    
    // Écouter les événements d'équipe pour les quêtes
    teamManager.on('pokemonAdded', (event) => {
      window.QuestSystem.checkProgress('catch_pokemon', event.detail);
    });
    
    teamManager.on('teamFull', () => {
      window.QuestSystem.checkProgress('team_full');
    });
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE CHAT ===
  if (window.ChatSystem) {
    console.log('🔗 Intégration avec ChatSystem...');
    
    // Commandes de chat pour l'équipe
    window.ChatSystem.addCommand('team', () => {
      if (teamManager.canInteract()) {
        teamManager.toggleTeamUI();
      } else {
        window.ChatSystem.addMessage('System', 'Cannot open team right now');
      }
    });
    
    window.ChatSystem.addCommand('heal', () => {
      teamManager.healTeam();
    });
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE COMBAT ===
  if (window.BattleSystem) {
    console.log('🔗 Intégration avec BattleSystem...');
    
    // Hook pour vérifier l'équipe avant un combat
    const originalStartBattle = window.BattleSystem.startBattle;
    window.BattleSystem.startBattle = function(...args) {
      if (!teamManager.onBattleStartRequested()) {
        return false; // Empêcher le combat si pas d'équipe
      }
      return originalStartBattle.apply(this, args);
    };
  }
  
  // === INTÉGRATION AVEC LE SYSTÈME DE SAUVEGARDE ===
  if (window.SaveSystem) {
    console.log('🔗 Intégration avec SaveSystem...');
    
    // Ajouter les données d'équipe à la sauvegarde
    const originalExportData = window.SaveSystem.exportData;
    window.SaveSystem.exportData = function() {
      const data = originalExportData.call(this);
      data.team = teamManager.exportData();
      return data;
    };
    
    const originalImportData = window.SaveSystem.importData;
    window.SaveSystem.importData = function(data) {
      originalImportData.call(this, data);
      if (data.team) {
        teamManager.importData(data.team);
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
      teamManager.closeTeamUI();
    }
  });
  
  // Gestion de la visibilité de la page
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && teamManager.teamUI?.isOpen()) {
      // Fermer l'équipe quand l'onglet devient invisible
      teamManager.closeTeamUI();
    }
  });
  
  // === ÉVÉNEMENTS CLAVIER GLOBAUX ===
  
  document.addEventListener('keydown', (e) => {
    // Raccourcis spéciaux avec Ctrl/Cmd
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      teamManager.toggleTeamUI();
    }
    
    // Raccourcis numériques pour sélectionner des Pokémon (Alt + 1-6)
    if (e.altKey && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const slot = parseInt(e.key) - 1;
      const pokemon = teamManager.getPokemonBySlot(slot);
      if (pokemon && teamManager.teamUI?.isOpen()) {
        teamManager.teamUI.selectPokemonBySlot(slot);
      }
    }
  });
  
  // === ÉVÉNEMENTS PERSONNALISÉS ===
  
  // Émettre des événements pour d'autres systèmes
  teamManager.on('pokemonAdded', (event) => {
    document.dispatchEvent(new CustomEvent('game:pokemonAddedToTeam', {
      detail: event.detail
    }));
  });
  
  teamManager.on('pokemonRemoved', (event) => {
    document.dispatchEvent(new CustomEvent('game:pokemonRemovedFromTeam', {
      detail: event.detail
    }));
  });
  
  teamManager.on('teamDefeated', (event) => {
    document.dispatchEvent(new CustomEvent('game:teamDefeated', {
      detail: event.detail
    }));
  });
  
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
    const teamManager = window.TeamManager;
    
    if (!teamManager) return;
    
    switch (key) {
      case finalKeybinds.toggleTeam:
        e.preventDefault();
        teamManager.toggleTeamUI();
        break;
        
      case finalKeybinds.healTeam:
        if (teamManager.teamUI?.isOpen()) {
          e.preventDefault();
          teamManager.healTeam();
        }
        break;
        
      case finalKeybinds.selectSlot1:
      case finalKeybinds.selectSlot2:
      case finalKeybinds.selectSlot3:
      case finalKeybinds.selectSlot4:
      case finalKeybinds.selectSlot5:
      case finalKeybinds.selectSlot6:
        if (teamManager.teamUI?.isOpen()) {
          e.preventDefault();
          const slot = parseInt(key) - 1;
          teamManager.teamUI.selectPokemonBySlot(slot);
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
    return !!(window.TeamManager && window.TeamManager.isInitialized);
  },
  
  /**
   * Obtient les statistiques actuelles de l'équipe
   */
  getCurrentTeamStats() {
    return window.TeamManager ? window.TeamManager.getTeamStats() : null;
  },
  
  /**
   * Force une synchronisation des données d'équipe
   */
  syncTeamData() {
    if (window.TeamManager) {
      window.TeamManager.requestTeamData();
    }
  },
  
  /**
   * Vérifie si un combat peut commencer
   */
  canStartBattle() {
    return window.TeamManager ? window.TeamManager.canBattle() : false;
  },
  
  /**
   * Obtient le Pokémon le plus fort de l'équipe
   */
  getStrongestPokemon() {
    if (!window.TeamManager) return null;
    
    const team = window.TeamManager.getAlivePokemon();
    if (team.length === 0) return null;
    
    return team.reduce((strongest, current) => {
      const strongestPower = calculatePokemonPower(strongest);
      const currentPower = calculatePokemonPower(current);
      return currentPower > strongestPower ? current : strongest;
    });
  },
  
  /**
   * Obtient des recommandations d'équipe basées sur les types
   */
  getTeamRecommendations(opponentTypes = []) {
    if (!window.TeamManager) return [];
    
    const team = window.TeamManager.getAlivePokemon();
    return team.map(pokemon => ({
      pokemon,
      effectiveness: calculateTypeMatchup(pokemon.types, opponentTypes),
      recommendation: getRecommendationText(pokemon, opponentTypes)
    })).sort((a, b) => b.effectiveness - a.effectiveness);
  },
  
  /**
   * Notifications rapides pour l'équipe
   */
  showTeamNotification(message, type = 'info') {
    if (window.TeamManager) {
      window.TeamManager.showNotification(message, type);
    }
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

function calculateTypeMatchup(pokemonTypes, opponentTypes) {
  // Logique simplifiée pour l'efficacité des types
  // À remplacer par la vraie logique Pokémon
  if (!pokemonTypes || !opponentTypes || opponentTypes.length === 0) {
    return 1.0;
  }
  
  // Pour l'instant, retourner une valeur neutre
  return 1.0;
}

function getRecommendationText(pokemon, opponentTypes) {
  const effectiveness = calculateTypeMatchup(pokemon.types, opponentTypes);
  
  if (effectiveness > 1.5) return 'Super efficace!';
  if (effectiveness > 1.0) return 'Efficace';
  if (effectiveness < 0.5) return 'Peu efficace';
  if (effectiveness < 1.0) return 'Pas très efficace';
  return 'Efficacité normale';
}

// Export par défaut
export default {
  setup: setupTeamSystem,
  utils: TeamIntegrationUtils,
  keybinds: setupCustomKeybinds
};
