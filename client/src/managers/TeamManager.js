// client/src/managers/TeamManager.js - Version Simple + Robuste (comme Inventaire/Quêtes)

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
    
    // État simple
    this.isInitialized = false;
    this.isInBattle = false;
    
    this.init();
  }

  init() {
    console.log('⚔️ TeamManager: Initialisation simple...');
    
    try {
      // 1. Créer les composants UI
      this.createUIComponents();
      
      // 2. Setup des listeners serveur
      this.setupServerListeners();
      
      // 3. Setup des raccourcis globaux
      this.setupGlobalShortcuts();
      
      // 4. ✅ ROBUSTESSE : Events Colyseus natifs
      this.setupColyseusEvents();
      
      this.isInitialized = true;
      console.log('✅ TeamManager initialisé avec succès');
      
      // 5. Demander les données initiales
      this.requestTeamData();
      
    } catch (error) {
      console.error('❌ Erreur initialisation TeamManager:', error);
      // Pas de système de retry complexe, juste un log
    }
  }

  // ✅ SIMPLE : Création directe des composants comme dans InventoryUI
  createUIComponents() {
    try {
      // Créer TeamUI
      this.teamUI = new TeamUI(this.gameRoom);
      console.log('✅ TeamUI créé');
      
      // Créer TeamIcon
      this.teamIcon = new TeamIcon(this.teamUI);
      console.log('✅ TeamIcon créé');
      
      // Afficher l'icône après un petit délai
      setTimeout(() => {
        if (this.teamIcon) {
          this.teamIcon.show();
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur création composants UI:', error);
      throw error;
    }
  }

  // ✅ SIMPLE : Setup listeners comme dans QuestJournalUI
  setupServerListeners() {
    if (!this.gameRoom) {
      console.error('❌ TeamManager: Pas de gameRoom pour les listeners');
      return;
    }

    console.log('🔧 TeamManager: Configuration listeners...');

    try {
      // Données d'équipe
      this.gameRoom.onMessage("teamData", (data) => {
        this.handleTeamData(data);
      });

      // Statistiques d'équipe
      this.gameRoom.onMessage("teamStats", (data) => {
        this.handleTeamStats(data);
      });

      // Pokémon ajouté
      this.gameRoom.onMessage("pokemonAddedToTeam", (data) => {
        this.handlePokemonAdded(data);
      });

      // Pokémon retiré
      this.gameRoom.onMessage("pokemonRemovedFromTeam", (data) => {
        this.handlePokemonRemoved(data);
      });

      // Pokémon mis à jour
      this.gameRoom.onMessage("pokemonUpdated", (data) => {
        this.handlePokemonUpdate(data);
      });

      // Équipe soignée
      this.gameRoom.onMessage("teamHealed", (data) => {
        this.handleTeamHealed(data);
      });

      // Résultats d'actions
      this.gameRoom.onMessage("teamActionResult", (data) => {
        this.handleTeamActionResult(data);
      });

      // Combat
      this.gameRoom.onMessage("battleStart", (data) => {
        this.handleBattleStart(data);
      });

      this.gameRoom.onMessage("battleEnd", (data) => {
        this.handleBattleEnd(data);
      });

      // Capture de Pokémon
      this.gameRoom.onMessage("pokemonCaught", (data) => {
        this.handlePokemonCaught(data);
      });

      console.log('✅ TeamManager: Listeners configurés');

    } catch (error) {
      console.error('❌ TeamManager: Erreur setup listeners:', error);
    }
  }

  // ✅ ROBUSTESSE : Events Colyseus natifs (comme recommandé)
  setupColyseusEvents() {
    if (!this.gameRoom) return;

    // Gérer les déconnexions proprement
    this.gameRoom.onLeave((code) => {
      console.warn('⚠️ TeamManager: Connexion fermée (code:', code, ')');
      this.handleDisconnect();
    });

    // Gérer les erreurs de connexion
    this.gameRoom.onError((code, message) => {
      console.error('❌ TeamManager: Erreur connexion (', code, '):', message);
      this.handleConnectionError();
    });

    console.log('✅ TeamManager: Events Colyseus configurés');
  }

  // ✅ ROBUSTESSE : Gestion propre des déconnexions
  handleDisconnect() {
    console.log('🔌 TeamManager: Gestion déconnexion...');
    
    // Désactiver temporairement l'interface
    if (this.teamIcon) {
      this.teamIcon.setEnabled(false);
    }
    
    // Fermer l'interface si ouverte
    if (this.teamUI && this.teamUI.isOpen()) {
      this.teamUI.hide();
    }
  }

  // ✅ ROBUSTESSE : Gestion des erreurs de connexion
  handleConnectionError() {
    console.log('⚠️ TeamManager: Erreur de connexion...');
    this.showNotification('Connexion instable, fonctionnalités limitées', 'warning');
  }

  // ✅ SIMPLE : Envoi sécurisé de messages (une seule vérification)
  safeSend(messageType, data = {}) {
    if (this.gameRoom && this.gameRoom.connection.readyState === 1) {
      try {
        this.gameRoom.send(messageType, data);
        return true;
      } catch (error) {
        console.error(`❌ Erreur envoi ${messageType}:`, error);
        return false;
      }
    } else {
      console.warn(`⚠️ Cannot send ${messageType}: connection not ready`);
      return false;
    }
  }

  // ✅ SIMPLE : Demande de données comme dans InventoryUI
  requestTeamData() {
    console.log('📡 TeamManager: Demande données équipe...');
    this.safeSend("getTeam");
  }

  // === HANDLERS SIMPLES (comme dans QuestJournalUI) ===

  handleTeamData(data) {
    try {
      console.log('⚔️ Données d\'équipe reçues:', data);
      
      this.teamData = Array.isArray(data.team) ? data.team : [];
      this.calculateStats();
      
      // Mettre à jour l'UI
      if (this.teamUI && this.teamUI.updateTeamData) {
        this.teamUI.updateTeamData(data);
      }
      
      if (this.teamIcon && this.teamIcon.updateTeamStats) {
        this.teamIcon.updateTeamStats(this.teamStats);
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamData:', error);
    }
  }

  handleTeamStats(data) {
    try {
      console.log('⚔️ Statistiques d\'équipe reçues:', data);
      
      this.teamStats = { ...this.teamStats, ...data };
      
      if (this.teamIcon && this.teamIcon.updateTeamStats) {
        this.teamIcon.updateTeamStats(this.teamStats);
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamStats:', error);
    }
  }

  handlePokemonAdded(data) {
    try {
      console.log('⚔️ Pokémon ajouté:', data);
      
      if (data.pokemon) {
        this.teamData.push(data.pokemon);
        this.calculateStats();
        
        // Animations
        if (this.teamIcon && this.teamIcon.onPokemonAdded) {
          this.teamIcon.onPokemonAdded(data.pokemon);
        }
        
        // Notification
        const name = data.pokemon.nickname || data.pokemon.name;
        this.showNotification(`${name} ajouté à l'équipe!`, 'success');
        
        // Rafraîchir l'UI si ouverte
        if (this.teamUI && this.teamUI.isOpen()) {
          this.requestTeamData();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonAdded:', error);
    }
  }

  handlePokemonRemoved(data) {
    try {
      console.log('⚔️ Pokémon retiré:', data);
      
      if (data.pokemonId) {
        this.teamData = this.teamData.filter(p => p._id !== data.pokemonId);
        this.calculateStats();
        
        // Animations
        if (this.teamIcon && this.teamIcon.onPokemonRemoved) {
          this.teamIcon.onPokemonRemoved();
        }
        
        this.showNotification('Pokémon retiré de l\'équipe', 'info');
        
        // Rafraîchir l'UI si ouverte
        if (this.teamUI && this.teamUI.isOpen()) {
          this.requestTeamData();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonRemoved:', error);
    }
  }

  handlePokemonUpdate(data) {
    try {
      console.log('⚔️ Pokémon mis à jour:', data);
      
      if (data.pokemonId) {
        const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
        if (pokemonIndex !== -1) {
          this.teamData[pokemonIndex] = { ...this.teamData[pokemonIndex], ...data.updates };
          this.calculateStats();
          
          // Mettre à jour l'UI si ouverte
          if (this.teamUI && this.teamUI.handlePokemonUpdate) {
            this.teamUI.handlePokemonUpdate(data);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonUpdate:', error);
    }
  }

  handleTeamHealed(data) {
    try {
      console.log('⚔️ Équipe soignée:', data);
      
      this.showNotification('Équipe soignée avec succès!', 'success');
      
      // Rafraîchir les données
      this.requestTeamData();
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamHealed:', error);
    }
  }

  handleTeamActionResult(data) {
    try {
      console.log('⚔️ Résultat action équipe:', data);
      
      if (data.success) {
        this.showNotification(data.message || 'Action réussie', 'success');
        this.requestTeamData(); // Rafraîchir
      } else {
        this.showNotification(data.message || 'Action échouée', 'error');
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamActionResult:', error);
    }
  }

  handleBattleStart(data) {
    try {
      console.log('⚔️ Combat démarré:', data);
      
      this.isInBattle = true;
      
      if (this.teamIcon && this.teamIcon.onBattleStart) {
        this.teamIcon.onBattleStart();
      }
      
      // Fermer l'interface pendant le combat
      if (this.teamUI && this.teamUI.isOpen()) {
        this.teamUI.hide();
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleBattleStart:', error);
    }
  }

  handleBattleEnd(data) {
    try {
      console.log('⚔️ Combat terminé:', data);
      
      this.isInBattle = false;
      
      if (this.teamIcon && this.teamIcon.onBattleEnd) {
        this.teamIcon.onBattleEnd();
      }
      
      // Rafraîchir les données après le combat
      this.requestTeamData();
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleBattleEnd:', error);
    }
  }

  handlePokemonCaught(data) {
    try {
      console.log('⚔️ Pokémon capturé:', data);
      
      if (data.addedToTeam && data.pokemon) {
        const name = data.pokemon.nickname || data.pokemon.name;
        this.showNotification(`${name} ajouté à l'équipe!`, 'success');
        
        if (this.teamUI && this.teamUI.onPokemonCaught) {
          this.teamUI.onPokemonCaught(data.pokemon);
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonCaught:', error);
    }
  }

  // === MÉTHODES PUBLIQUES SIMPLES ===

  // ✅ SIMPLE : Toggle comme dans InventoryUI
  toggleTeamUI() {
    if (!this.isInitialized) {
      this.showNotification('Système d\'équipe en cours d\'initialisation...', 'warning');
      return;
    }

    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI) {
      this.teamUI.toggle();
    }
  }

  openTeamUI() {
    if (this.teamUI && this.canInteract()) {
      this.teamUI.show();
    }
  }

  closeTeamUI() {
    if (this.teamUI) {
      this.teamUI.hide();
    }
  }

  // ✅ SIMPLE : Actions de base
  healTeam() {
    if (this.safeSend("healTeam")) {
      this.showNotification('Demande de soin envoyée...', 'info');
    } else {
      this.showNotification('Impossible de soigner l\'équipe', 'error');
    }
  }

  healPokemon(pokemonId) {
    if (this.safeSend("healPokemon", { pokemonId })) {
      this.showNotification('Demande de soin envoyée...', 'info');
    } else {
      this.showNotification('Impossible de soigner le Pokémon', 'error');
    }
  }

  removePokemon(pokemonId) {
    this.safeSend("removeFromTeam", { pokemonId });
  }

  swapPokemon(fromSlot, toSlot) {
    this.safeSend("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
  }

  autoArrangeTeam() {
    this.safeSend("autoArrangeTeam");
  }

  // === MÉTHODES UTILITAIRES ===

  calculateStats() {
    try {
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
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur calculateStats:', error);
    }
  }

  // ✅ SIMPLE : Vérification d'interaction comme dans InventoryUI
  canInteract() {
    if (!this.isInitialized) return false;
    
    try {
      const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
      const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
      const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
      const shopOpen = document.querySelector('#shop-overlay') && !document.querySelector('#shop-overlay').classList.contains('hidden');
      const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
      
      return !this.isInBattle && !questDialogOpen && !chatOpen && !inventoryOpen && !shopOpen && !dialogueOpen;
    } catch (error) {
      console.error('❌ TeamManager: Erreur canInteract:', error);
      return false;
    }
  }

  // ✅ SIMPLE : Notification comme dans InventoryUI
  showNotification(message, type = 'info') {
    try {
      // Essayer les systèmes de notification globaux
      if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
      } else if (typeof window.showGameNotification === 'function') {
        window.showGameNotification(message, type);
      } else {
        // Fallback : log simple
        console.log(`📢 TeamManager [${type}]: ${message}`);
      }
    } catch (error) {
      console.error('❌ TeamManager: Erreur notification:', error);
    }
  }

  // ✅ SIMPLE : Setup raccourcis comme dans InventoryUI
  setupGlobalShortcuts() {
    // Raccourci global T
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          this.canInteract()) {
        e.preventDefault();
        this.toggleTeamUI();
      }
    });

    // Intégration globale
    window.isTeamOpen = () => this.teamUI?.isOpen() || false;
    window.TeamManager = this;
  }

  // === GETTERS SIMPLES ===

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

  // === MÉTHODES DE DEBUG ===

  debugState() {
    console.log('🔍 TeamManager Debug:', {
      isInitialized: this.isInitialized,
      teamCount: this.teamData.length,
      teamStats: this.teamStats,
      hasTeamUI: !!this.teamUI,
      hasTeamIcon: !!this.teamIcon,
      canInteract: this.canInteract(),
      isInBattle: this.isInBattle
    });
  }

  // ✅ SIMPLE : Destroy propre
  destroy() {
    console.log('⚔️ TeamManager: Destruction...');
    
    this.isInitialized = false;
    
    // Nettoyer les composants UI
    if (this.teamUI) {
      this.teamUI.destroy?.();
      this.teamUI = null;
    }
    
    if (this.teamIcon) {
      this.teamIcon.destroy?.();
      this.teamIcon = null;
    }
    
    // Nettoyer les références globales
    if (window.isTeamOpen) {
      delete window.isTeamOpen;
    }
    
    if (window.TeamManager === this) {
      delete window.TeamManager;
    }
    
    this.teamData = [];
    this.gameRoom = null;
    
    console.log('✅ TeamManager détruit');
  }
}

// ✅ SIMPLE : Fonction d'initialisation comme pour les autres systèmes
export function initializeTeamSystem(gameRoom) {
  if (window.TeamManager && window.TeamManager.isInitialized) {
    console.log('⚔️ TeamManager déjà initialisé');
    return window.TeamManager;
  }
  
  if (!gameRoom) {
    console.error('❌ initializeTeamSystem: Pas de gameRoom fournie');
    return null;
  }

  console.log('🔧 Initialisation TeamManager...');
  
  try {
    const teamManager = new TeamManager(gameRoom);
    window.TeamManager = teamManager;
    window.teamManagerGlobal = teamManager;
    
    console.log('✅ TeamManager initialisé');
    return teamManager;
  } catch (error) {
    console.error('❌ Erreur initialisation TeamManager:', error);
    return null;
  }
}

export default TeamManager;
