// client/src/managers/TeamManager.js - Gestionnaire d'équipe côté client

import { TeamUI } from '../components/TeamUI.js';
import { TeamIcon } from '../components/TeamIcon.js';

export class TeamManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      faintedPokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    // Composants UI
    this.teamUI = null;
    this.teamIcon = null;
    
    // État
    this.isInitialized = false;
    this.isInBattle = false;
    
    this.init();
  }

  async init() {
    try {
      // Créer les composants UI
      this.teamUI = new TeamUI(this.gameRoom);
      this.teamIcon = new TeamIcon(this.teamUI);
      
      // Configurer les listeners serveur
      this.setupServerListeners();
      
      // Configurer les raccourcis globaux
      this.setupGlobalShortcuts();
      
      // Afficher l'icône
      this.teamIcon.show();
      
      this.isInitialized = true;
      console.log('⚔️ TeamManager initialisé avec succès');
      
      // Demander les données initiales
      this.requestTeamData();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du TeamManager:', error);
    }
  }

  setupServerListeners() {
    if (!this.gameRoom) return;

    // Données d'équipe reçues
    this.gameRoom.onMessage("teamData", (data) => {
      this.handleTeamData(data);
    });

    // Statistiques d'équipe mises à jour
    this.gameRoom.onMessage("teamStats", (data) => {
      this.handleTeamStats(data);
    });

    // Pokémon ajouté à l'équipe
    this.gameRoom.onMessage("pokemonAddedToTeam", (data) => {
      this.handlePokemonAdded(data);
    });

    // Pokémon retiré de l'équipe
    this.gameRoom.onMessage("pokemonRemovedFromTeam", (data) => {
      this.handlePokemonRemoved(data);
    });

    // Pokémon mis à jour (HP, statut, etc.)
    this.gameRoom.onMessage("pokemonUpdated", (data) => {
      this.handlePokemonUpdate(data);
    });

    // Équipe soignée
    this.gameRoom.onMessage("teamHealed", (data) => {
      this.handleTeamHealed(data);
    });

    // Résultat d'actions d'équipe
    this.gameRoom.onMessage("teamActionResult", (data) => {
      this.handleTeamActionResult(data);
    });

    // Début/fin de combat
    this.gameRoom.onMessage("battleStart", (data) => {
      this.handleBattleStart(data);
    });

    this.gameRoom.onMessage("battleEnd", (data) => {
      this.handleBattleEnd(data);
    });

    // Pokémon capturé
    this.gameRoom.onMessage("pokemonCaught", (data) => {
      this.handlePokemonCaught(data);
    });
  }

  setupGlobalShortcuts() {
    // Raccourci global pour ouvrir l'équipe (T)
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          this.canInteract()) {
        e.preventDefault();
        this.toggleTeamUI();
      }
    });

    // Intégration avec window pour d'autres composants
    window.isTeamOpen = () => this.teamUI?.isOpen() || false;
    window.TeamManager = this;
  }

  // === GESTION DES DONNÉES ===

  handleTeamData(data) {
    console.log('⚔️ Données d\'équipe reçues:', data);
    
    this.teamData = data.team || [];
    this.calculateStats();
    
    // Mettre à jour les composants UI
    if (this.teamUI) {
      this.teamUI.updateTeamData(data);
    }
    
    if (this.teamIcon) {
      this.teamIcon.updateTeamStats(this.teamStats);
    }
  }

  handleTeamStats(data) {
    console.log('⚔️ Statistiques d\'équipe reçues:', data);
    
    this.teamStats = { ...this.teamStats, ...data };
    
    if (this.teamIcon) {
      this.teamIcon.updateTeamStats(this.teamStats);
    }
  }

  handlePokemonAdded(data) {
    console.log('⚔️ Pokémon ajouté à l\'équipe:', data);
    
    // Mettre à jour les données locales
    if (data.pokemon) {
      this.teamData.push(data.pokemon);
      this.calculateStats();
    }
    
    // Animations et notifications
    if (this.teamIcon) {
      this.teamIcon.onPokemonAdded(data.pokemon);
      this.teamIcon.updateTeamStats(this.teamStats);
    }
    
    if (this.teamUI && this.teamUI.isOpen()) {
      this.teamUI.requestTeamData(); // Rafraîchir l'UI
    }
    
    this.showNotification(`${data.pokemon.nickname || data.pokemon.name} ajouté à l'équipe!`, 'success');
  }

  handlePokemonRemoved(data) {
    console.log('⚔️ Pokémon retiré de l\'équipe:', data);
    
    // Mettre à jour les données locales
    this.teamData = this.teamData.filter(p => p._id !== data.pokemonId);
    this.calculateStats();
    
    // Animations et notifications
    if (this.teamIcon) {
      this.teamIcon.onPokemonRemoved();
      this.teamIcon.updateTeamStats(this.teamStats);
    }
    
    if (this.teamUI && this.teamUI.isOpen()) {
      this.teamUI.requestTeamData(); // Rafraîchir l'UI
    }
    
    this.showNotification('Pokémon envoyé au PC', 'info');
  }

  handlePokemonUpdate(data) {
    console.log('⚔️ Pokémon mis à jour:', data);
    
    // Mettre à jour les données locales
    const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
    if (pokemonIndex !== -1) {
      this.teamData[pokemonIndex] = { ...this.teamData[pokemonIndex], ...data.updates };
      
      // Si un Pokémon est tombé KO
      if (data.updates.currentHp === 0 && this.teamData[pokemonIndex].currentHp > 0) {
        this.handlePokemonFainted(this.teamData[pokemonIndex]);
      }
      
      this.calculateStats();
    }
    
    // Mettre à jour les composants UI
    if (this.teamIcon) {
      this.teamIcon.updateTeamStats(this.teamStats);
    }
    
    if (this.teamUI && this.teamUI.isOpen()) {
      this.teamUI.handlePokemonUpdate(data);
    }
  }

  handlePokemonFainted(pokemon) {
    console.log('⚔️ Pokémon KO:', pokemon);
    
    if (this.teamIcon) {
      this.teamIcon.onPokemonFainted();
    }
    
    this.showNotification(`${pokemon.nickname || pokemon.name} est KO!`, 'error');
    
    // Vérifier si toute l'équipe est KO
    if (this.teamStats.alivePokemon === 0) {
      this.handleTeamDefeated();
    }
  }

  handleTeamHealed(data) {
    console.log('⚔️ Équipe soignée:', data);
    
    // Mettre à jour les données locales
    this.teamData.forEach(pokemon => {
      pokemon.currentHp = pokemon.maxHp;
      pokemon.status = 'normal';
      if (pokemon.moves) {
        pokemon.moves.forEach(move => {
          move.currentPp = move.maxPp;
        });
      }
    });
    
    this.calculateStats();
    
    // Mettre à jour les composants UI
    if (this.teamIcon) {
      this.teamIcon.updateTeamStats(this.teamStats);
      this.teamIcon.onTeamUpdate({ type: 'healed' });
    }
    
    if (this.teamUI && this.teamUI.isOpen()) {
      this.teamUI.requestTeamData();
    }
    
    this.showNotification('Équipe entièrement soignée!', 'success');
  }

  handleTeamActionResult(data) {
    console.log('⚔️ Résultat action équipe:', data);
    
    if (data.success) {
      this.showNotification(data.message || 'Action réussie', 'success');
      
      // Rafraîchir les données selon l'action
      if (data.action === 'swap' || data.action === 'rearrange') {
        this.requestTeamData();
      }
    } else {
      this.showNotification(data.message || 'Action échouée', 'error');
    }
  }

  handleBattleStart(data) {
    console.log('⚔️ Début de combat');
    
    this.isInBattle = true;
    
    // Mettre à jour les composants UI
    if (this.teamIcon) {
      this.teamIcon.onBattleStart();
    }
    
    // Fermer l'UI d'équipe pendant le combat
    if (this.teamUI && this.teamUI.isOpen()) {
      this.teamUI.hide();
    }
  }

  handleBattleEnd(data) {
    console.log('⚔️ Fin de combat');
    
    this.isInBattle = false;
    
    // Mettre à jour les composants UI
    if (this.teamIcon) {
      this.teamIcon.onBattleEnd();
    }
    
    // Rafraîchir les données d'équipe après le combat
    this.requestTeamData();
  }

  handlePokemonCaught(data) {
    console.log('⚔️ Pokémon capturé:', data);
    
    if (data.addedToTeam) {
      // Le Pokémon a été ajouté directement à l'équipe
      this.handlePokemonAdded({ pokemon: data.pokemon });
    } else {
      // Le Pokémon a été envoyé au PC
      this.showNotification(`${data.pokemon.name} capturé et envoyé au PC`, 'info');
    }
    
    // Notification de l'icône d'équipe si elle existe
    if (this.teamUI) {
      this.teamUI.onPokemonCaught(data.pokemon);
    }
  }

  handleTeamDefeated() {
    console.log('⚔️ Équipe entièrement vaincue');
    
    this.showNotification('Toute votre équipe est KO!', 'error');
    
    // Logique spéciale pour défaite (téléportation, etc.)
    // Cette partie sera gérée par le serveur
  }

  // === CALCULS ET STATISTIQUES ===

  calculateStats() {
    this.teamStats.totalPokemon = this.teamData.length;
    this.teamStats.alivePokemon = this.teamData.filter(p => p.currentHp > 0).length;
    this.teamStats.faintedPokemon = this.teamData.filter(p => p.currentHp === 0).length;
    this.teamStats.canBattle = this.teamStats.alivePokemon > 0;
    
    if (this.teamData.length > 0) {
      const totalLevel = this.teamData.reduce((sum, p) => sum + (p.level || 1), 0);
      this.teamStats.averageLevel = Math.round(totalLevel / this.teamData.length);
    } else {
      this.teamStats.averageLevel = 0;
    }
    
    console.log('⚔️ Stats calculées:', this.teamStats);
  }

  // === MÉTHODES PUBLIQUES ===

  toggleTeamUI() {
    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI) {
      this.teamUI.toggle();
    }
  }

  openTeamUI() {
    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI) {
      this.teamUI.show();
    }
  }

  closeTeamUI() {
    if (this.teamUI) {
      this.teamUI.hide();
    }
  }

  requestTeamData() {
    if (this.gameRoom) {
      this.gameRoom.send("getTeam");
    }
  }

  canInteract() {
    // Vérifier si le joueur peut interagir avec l'équipe
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    const shopOpen = document.querySelector('#shop-overlay') && !document.querySelector('#shop-overlay').classList.contains('hidden');
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    
    return !this.isInBattle && !questDialogOpen && !chatOpen && !inventoryOpen && !shopOpen && !dialogueOpen;
  }

  // === ACTIONS D'ÉQUIPE ===

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

  swapPokemon(slotA, slotB) {
    if (this.gameRoom) {
      this.gameRoom.send("swapTeamSlots", { slotA, slotB });
    }
  }

  removePokemonFromTeam(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("removeFromTeam", { pokemonId });
    }
  }

  addPokemonToTeam(pokemonId) {
    if (this.gameRoom) {
      this.gameRoom.send("addToTeam", { pokemonId });
    }
  }

  // === GETTERS POUR L'INTÉGRATION ===

  getTeamData() {
    return [...this.teamData];
  }

  getTeamStats() {
    return { ...this.teamStats };
  }

  getPokemonBySlot(slot) {
    return this.teamData.find(p => p.slot === slot) || null;
  }

  getPokemonById(pokemonId) {
    return this.teamData.find(p => p._id === pokemonId) || null;
  }

  getFirstAlivePokemon() {
    return this.teamData.find(p => p.currentHp > 0) || null;
  }

  getAlivePokemon() {
    return this.teamData.filter(p => p.currentHp > 0);
  }

  getFaintedPokemon() {
    return this.teamData.filter(p => p.currentHp === 0);
  }

  isTeamFull() {
    return this.teamData.length >= 6;
  }

  canBattle() {
    return this.teamStats.canBattle;
  }

  // === NOTIFICATIONS ===

  showNotification(message, type = 'info') {
    // Utiliser le système de notification global ou créer une notification simple
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
    } else {
      this.createSimpleNotification(message, type);
    }
  }

  createSimpleNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = 'team-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1002;
      animation: slideInRight 0.4s ease;
      max-width: 300px;
      border-left: 4px solid;
    `;

    switch (type) {
      case 'success':
        notification.style.background = 'rgba(46, 204, 113, 0.95)';
        notification.style.borderLeftColor = '#2ecc71';
        break;
      case 'error':
        notification.style.background = 'rgba(231, 76, 60, 0.95)';
        notification.style.borderLeftColor = '#e74c3c';
        break;
      case 'warning':
        notification.style.background = 'rgba(243, 156, 18, 0.95)';
        notification.style.borderLeftColor = '#f39c12';
        break;
      default:
        notification.style.background = 'rgba(52, 152, 219, 0.95)';
        notification.style.borderLeftColor = '#3498db';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Ajouter les animations CSS si elles n'existent pas
    if (!document.querySelector('#team-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'team-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Auto-suppression
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
      }
    }, 3000);
  }

  // === INTÉGRATION AVEC D'AUTRES SYSTÈMES ===

  // Méthode appelée par le système de combat
  onBattleStartRequested() {
    if (!this.canBattle()) {
      this.showNotification('Aucun Pokémon en état de combattre!', 'error');
      return false;
    }
    return true;
  }

  // Méthode pour le système de sauvegarde
  exportData() {
    return {
      teamStats: this.teamStats,
      isInBattle: this.isInBattle,
      uiState: this.teamUI ? this.teamUI.exportData() : null
    };
  }

  importData(data) {
    if (data.teamStats) {
      this.teamStats = { ...this.teamStats, ...data.teamStats };
    }
    
    if (data.isInBattle !== undefined) {
      this.isInBattle = data.isInBattle;
    }
    
    if (data.uiState && this.teamUI) {
      this.teamUI.importData(data.uiState);
    }
  }

  // === MÉTHODES DE DEBUG ===

  debugTeam() {
    console.group('⚔️ Team Debug Info');
    console.log('Team Data:', this.teamData);
    console.log('Team Stats:', this.teamStats);
    console.log('Is In Battle:', this.isInBattle);
    console.log('Can Interact:', this.canInteract());
    console.log('UI Components:', {
      teamUI: !!this.teamUI,
      teamIcon: !!this.teamIcon,
      teamUIOpen: this.teamUI?.isOpen()
    });
    console.groupEnd();
  }

  // === MÉTHODES DE NETTOYAGE ===

  destroy() {
    console.log('⚔️ Destruction du TeamManager');
    
    // Nettoyer les composants UI
    if (this.teamUI) {
      this.teamUI.destroy();
      this.teamUI = null;
    }
    
    if (this.teamIcon) {
      this.teamIcon.destroy();
      this.teamIcon = null;
    }
    
    // Nettoyer les références globales
    if (window.isTeamOpen) {
      delete window.isTeamOpen;
    }
    
    if (window.TeamManager === this) {
      delete window.TeamManager;
    }
    
    // Nettoyer les données
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      faintedPokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    this.gameRoom = null;
    this.isInitialized = false;
  }

  // === MÉTHODES UTILITAIRES ===

  formatPokemonName(pokemon) {
    return pokemon.nickname || pokemon.name || `Pokémon #${pokemon.pokemonId}`;
  }

  getPokemonTypeEffectiveness(attackType, defendingPokemon) {
    // Cette méthode sera utilisée pour les calculs de combat
    // À implémenter avec la logique des types Pokémon
    return 1.0; // Neutre par défaut
  }

  getTeamTypeCoverage() {
    const types = new Set();
    this.teamData.forEach(pokemon => {
      if (pokemon.types) {
        pokemon.types.forEach(type => types.add(type));
      }
    });
    return Array.from(types);
  }

  getTeamAverageStats() {
    if (this.teamData.length === 0) {
      return { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    }

    const totals = this.teamData.reduce((acc, pokemon) => {
      const stats = pokemon.calculatedStats || {};
      return {
        hp: acc.hp + (pokemon.maxHp || 0),
        attack: acc.attack + (stats.attack || 0),
        defense: acc.defense + (stats.defense || 0),
        spAttack: acc.spAttack + (stats.spAttack || 0),
        spDefense: acc.spDefense + (stats.spDefense || 0),
        speed: acc.speed + (stats.speed || 0)
      };
    }, { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 });

    const count = this.teamData.length;
    return {
      hp: Math.round(totals.hp / count),
      attack: Math.round(totals.attack / count),
      defense: Math.round(totals.defense / count),
      spAttack: Math.round(totals.spAttack / count),
      spDefense: Math.round(totals.spDefense / count),
      speed: Math.round(totals.speed / count)
    };
  }

  // === ÉVÉNEMENTS PERSONNALISÉS ===

  emit(eventName, data) {
    const event = new CustomEvent(`team:${eventName}`, { 
      detail: data,
      bubbles: true 
    });
    document.dispatchEvent(event);
  }

  on(eventName, callback) {
    document.addEventListener(`team:${eventName}`, callback);
  }

  off(eventName, callback) {
    document.removeEventListener(`team:${eventName}`, callback);
  }
}

// Fonction d'initialisation globale
export function initializeTeamSystem(gameRoom) {
  if (window.TeamManager) {
    console.warn('⚠️ TeamManager déjà initialisé');
    return window.TeamManager;
  }
  
  const teamManager = new TeamManager(gameRoom);
  window.TeamManager = teamManager;
  
  console.log('✅ Système d\'équipe initialisé');
  return teamManager;
}

// Export par défaut
export default TeamManager;
