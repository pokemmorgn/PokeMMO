// client/src/integration/teamIntegration.js - VERSION CORRIGÉE SANS setTeamIcon
// ✅ Intégration qui fonctionne même si setTeamIcon n'existe pas

import TeamManager from '../managers/TeamManager.js';
import { TeamUI } from '../components/TeamUI.js';
import { TeamIcon } from '../components/TeamIcon.js';

/**
 * Initialise et intègre le système d'équipe dans le jeu principal
 * VERSION CORRIGÉE qui ne dépend pas de setTeamIcon
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
    
    // ✅ 3. CONNECTER MANUELLEMENT TEAMUI À TEAMICON
    console.log('🔗 Connexion manuelle...');
    teamUI.teamIcon = teamIcon; // Connexion directe
    
    // ✅ 4. AJOUTER LA MÉTHODE setTeamIcon DYNAMIQUEMENT SI ELLE N'EXISTE PAS
    if (!teamUI.setTeamIcon) {
      teamUI.setTeamIcon = function(icon) {
        this.teamIcon = icon;
        console.log('🔗 TeamIcon connecté à TeamUI (méthode dynamique):', !!icon);
      };
      
      teamUI.updateTeamIconStats = function() {
        if (!this.teamIcon) return;
        
        const stats = {
          totalPokemon: this.teamData.length,
          alivePokemon: this.teamData.filter(p => p.currentHp > 0).length,
          canBattle: this.teamData.some(p => p.currentHp > 0)
        };
        
        this.teamIcon.updateTeamStats(stats);
      };
      
      console.log('✅ Méthodes TeamIcon ajoutées dynamiquement à TeamUI');
    }
    
    // ✅ 5. HOOKER LA MÉTHODE updateTeamStats EXISTANTE
    const originalUpdateTeamStats = teamUI.updateTeamStats.bind(teamUI);
    teamUI.updateTeamStats = function() {
      // Appeler la méthode originale
      originalUpdateTeamStats();
      // Puis mettre à jour l'icône
      if (this.updateTeamIconStats) {
        this.updateTeamIconStats();
      }
    };
    
    // ✅ 6. CRÉER TEAMMANAGER AVEC LES COMPOSANTS CONNECTÉS
    console.log('🎮 Création de TeamManager...');
    const teamManager = new TeamManager(null, gameRoom);
    
    // ✅ 7. INTÉGRER LES COMPOSANTS DANS LE TEAMMANAGER
    if (teamManager) {
      teamManager.teamUI = teamUI;
      teamManager.teamIcon = teamIcon;
      
      // Marquer comme initialisé
      teamManager.isInitialized = true;
      
      console.log('✅ TeamManager configuré avec TeamUI et TeamIcon');
    }
    
    // ✅ 8. EXPOSER GLOBALEMENT
    window.teamSystem = teamManager;
    window.TeamManager = teamManager;
    window.teamManagerGlobal = teamManager;
    window.teamUI = teamUI;
    window.teamIcon = teamIcon;
    
    // ✅ 9. INTÉGRATIONS ET ÉVÉNEMENTS
    integrateWithExistingSystems(teamManager);
    setupGlobalTeamEvents(teamManager);
    
    // ✅ 10. SYNCHRONISATION INITIALE
    setTimeout(() => {
      if (teamUI.requestTeamData) {
        teamUI.requestTeamData();
      }
    }, 1000);
    
    console.log('✅ Système d\'équipe configuré avec succès');
    console.log('📊 Components créés:', {
      teamManager: !!teamManager,
      teamUI: !!teamUI,
      teamIcon: !!teamIcon,
      connected: teamUI.teamIcon === teamIcon,
      hasSetTeamIcon: typeof teamUI.setTeamIcon === 'function',
      hasUpdateIconStats: typeof teamUI.updateTeamIconStats === 'function'
    });
    
    return teamManager;
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration du système d\'équipe:', error);
    throw error;
  }
}

/**
 * Version ultra-simple qui ne peut pas échouer
 */
export function setupSimpleTeamSystem(gameRoom) {
  console.log('🔧 Configuration simple du système d\'équipe...');
  
  try {
    // Créer TeamUI
    const teamUI = new TeamUI(gameRoom);
    
    // Créer TeamIcon
    const teamIcon = new TeamIcon(teamUI);
    
    // Connecter directement
    teamUI.teamIcon = teamIcon;
    
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
      
      // Synchronisation manuelle
      syncStats: () => {
        if (teamUI.teamData && teamIcon.updateTeamStats) {
          const stats = {
            totalPokemon: teamUI.teamData.length,
            alivePokemon: teamUI.teamData.filter(p => p.currentHp > 0).length,
            canBattle: teamUI.teamData.some(p => p.currentHp > 0)
          };
          teamIcon.updateTeamStats(stats);
        }
      },
      
      // Nettoyage
      destroy: () => {
        teamUI.destroy();
        teamIcon.destroy();
      }
    };
    
    window.teamManagerGlobal = simpleManager;
    
    // Hooker updateTeamData pour synchroniser automatiquement
    const originalUpdateTeamData = teamUI.updateTeamData.bind(teamUI);
    teamUI.updateTeamData = function(data) {
      originalUpdateTeamData(data);
      simpleManager.syncStats();
    };
    
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

// Export par défaut
export default {
  setup: setupTeamSystem,
  setupSimple: setupSimpleTeamSystem
};
