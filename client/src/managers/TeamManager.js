// client/src/managers/TeamManager.js - VERSION EXACTEMENT COMME L'INVENTAIRE
// ✅ Copie du modèle InventorySystem qui fonctionne

import { TeamUI } from '../components/TeamUI.js';
import { TeamIcon } from '../components/TeamIcon.js';

export class TeamManager {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.teamUI = null;
    this.teamIcon = null;
    
    // Données d'équipe
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      faintedPokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    this.init();
  }

  init() {
    // Créer l'interface d'équipe
    this.teamUI = new TeamUI(this.gameRoom);
    
    // Créer l'icône d'équipe
    this.teamIcon = new TeamIcon(this.teamUI);
    
    // Configurer les interactions entre les composants
    this.setupInteractions();
    
    // Rendre le système accessible globalement
    window.teamSystem = this;
    window.TeamManager = this;
    
    console.log("⚔️ Système d'équipe initialisé");
  }

  setupInteractions() {
    // Écouter les événements du serveur pour l'équipe
    this.setupServerListeners();
    
    // Configurer les raccourcis clavier
    this.setupKeyboardShortcuts();
    
    // Intégrer avec les autres systèmes
    this.setupSystemIntegration();
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Données d'équipe complètes
    this.gameRoom.onMessage("teamData", (data) => {
      this.teamUI.updateTeamData(data);
      this.updateLocalTeamData(data);
    });

    // Mises à jour d'équipe
    this.gameRoom.onMessage("teamActionResult", (data) => {
      this.teamUI.handleTeamActionResult(data);
      this.showNotification(data.message, data.success ? 'success' : 'error');
    });

    // Pokémon soigné
    this.gameRoom.onMessage("teamHealed", (data) => {
      this.showNotification('Équipe soignée!', 'success');
    });

    // Stats d'équipe
    this.gameRoom.onMessage("teamStats", (data) => {
      this.teamStats = data;
      this.teamIcon.updateTeamStats(data);
    });
  }

  updateLocalTeamData(data) {
    this.teamData = Array.isArray(data.team) ? data.team : [];
    this.calculateStats();
  }

  calculateStats() {
    this.teamStats.totalPokemon = this.teamData.length;
    this.teamStats.alivePokemon = this.teamData.filter(p => p && p.currentHp > 0).length;
    this.teamStats.faintedPokemon = this.teamData.filter(p => p && p.currentHp === 0).length;
    this.teamStats.canBattle = this.teamStats.alivePokemon > 0;
    
    if (this.teamData.length > 0) {
      const totalLevel = this.teamData.reduce((sum, p) => sum + (p?.level || 1), 0);
      this.teamStats.averageLevel = Math.round(totalLevel / this.teamData.length);
    } else {
      this.teamStats.averageLevel = 0;
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ne pas traiter les raccourcis si on ne peut pas interagir
      if (!this.canPlayerInteract()) return;

      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          this.toggleTeam();
          break;
      }
    });

    // Raccourcis quand l'équipe est ouverte
    document.addEventListener('keydown', (e) => {
      if (this.teamUI.isVisible) {
        const handled = this.teamUI.handleKeyPress(e.key);
        if (handled) {
          e.preventDefault();
        }
      }
    });
  }

  setupSystemIntegration() {
    // Intégration avec le système de quêtes
    if (window.questSystem) {
      // Écouter les événements de capture pour les quêtes
      this.gameRoom?.onMessage("pokemonCaught", (data) => {
        if (data.addedToTeam) {
          window.questSystem.triggerCatchEvent(data.pokemon);
        }
      });
    }

    // Intégration avec le chat
    if (typeof window.isChatFocused === 'function') {
      // Désactiver l'équipe quand le chat est actif
      setInterval(() => {
        const chatFocused = window.isChatFocused();
        this.teamIcon.setEnabled(!chatFocused);
      }, 1000);
    }
  }

  // === MÉTHODES PUBLIQUES ===

  toggleTeam() {
    if (this.teamUI) {
      this.teamUI.toggle();
    }
  }

  openTeam() {
    if (this.teamUI) {
      this.teamUI.show();
    }
  }

  closeTeam() {
    if (this.teamUI) {
      this.teamUI.hide();
    }
  }

  isTeamOpen() {
    return this.teamUI ? this.teamUI.isVisible : false;
  }

  requestTeamData() {
    if (this.gameRoom) {
      this.gameRoom.send("getTeam");
    }
  }

  healTeam() {
    if (this.gameRoom) {
      this.gameRoom.send("healTeam");
    }
  }

  healPokemon(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("healPokemon", { pokemonId });
    }
  }

  removePokemon(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("removeFromTeam", { pokemonId });
    }
  }

  swapPokemon(fromSlot, toSlot) {
    if (this.gameRoom) {
      this.gameRoom.send("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
    }
  }

  canPlayerInteract() {
    return this.teamUI.canPlayerInteract();
  }

  showNotification(message, type = 'info') {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type);
    } else {
      console.log(`📢 [${type}]: ${message}`);
    }
  }

  getTeamData() {
    return [...this.teamData];
  }

  getTeamStats() {
    return { ...this.teamStats };
  }

  canBattle() {
    return this.teamStats.canBattle;
  }

  isTeamFull() {
    return this.teamData.length >= 6;
  }

  getPokemonBySlot(slot) {
    return this.teamData[slot] || null;
  }

  getAlivePokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0);
  }
}
// ✅ MAINTENANT LA FONCTION D'INITIALISATION COMME L'INVENTAIRE
// Dans main.js, cette fonction sera appelée comme pour l'inventaire

window.initTeamSystem = function(gameRoom) {
  if (window.teamSystem) {
    console.log(`[TeamSystem] Réutilisation du système d'équipe global existant`);
    if (gameRoom && gameRoom !== window.teamSystem.gameRoom) {
      window.teamSystem.gameRoom = gameRoom;
      window.teamSystem.setupServerListeners();
    }
    return window.teamSystem;
  }

  try {
    console.log(`⚔️ Initialisation du système d'équipe...`);
    const teamSystem = new TeamManager(null, gameRoom);

    window.teamSystem = teamSystem;
    window.TeamManager = teamSystem;
    window.teamSystemGlobal = teamSystem;

    console.log(`✅ Système d'équipe initialisé`);

    // Test de connexion après un délai
    setTimeout(() => {
      if (teamSystem && gameRoom) {
        teamSystem.requestTeamData();
      }
    }, 2000);

    return teamSystem;

  } catch (error) {
    console.error(`❌ Erreur initialisation système d'équipe:`, error);
    return null;
  }
};

export default TeamManager;
