// client/src/managers/TeamManager.js - VERSION SIMPLIFIÉE ET PERSISTANTE
// ✅ Correction des problèmes de timing et persistence

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
    this.isDestroyed = false;
    
    // ✅ SUPPRESSION des callbacks complexes qui causent l'erreur
    // Plus de callbacks onPokemonAdded etc.
    
    console.log('⚔️ TeamManager: Instance créée (version simplifiée)');
  }

  // ✅ MÉTHODE SIMPLIFIÉE : Une seule tentative d'init
  async init() {
    if (this.isDestroyed) {
      console.warn('⚠️ TeamManager: Instance détruite');
      return false;
    }

    if (this.isInitialized) {
      console.log('ℹ️ TeamManager: Déjà initialisé');
      return true;
    }

    console.log('⚔️ TeamManager: === INITIALISATION SIMPLE ===');

    try {
      // 1. Vérifier la connexion
      if (!this.gameRoom) {
        throw new Error('Pas de gameRoom');
      }

      // 2. Créer les composants UI simplement
      await this.createUIComponents();
      
      // 3. Setup des listeners serveur
      this.setupServerListeners();
      
      // 4. Setup global
      this.setupGlobalReferences();
      
      this.isInitialized = true;
      console.log('✅ TeamManager: Initialisé avec succès');
      
      // 5. Demander les données initiales
      setTimeout(() => {
        if (!this.isDestroyed && this.isInitialized) {
          this.requestTeamData();
        }
      }, 500);
      
      return true;
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur init:', error);
      return false;
    }
  }

  // ✅ CRÉATION UI SIMPLIFIÉE - sans retry complexe
  async createUIComponents() {
    console.log('🔧 TeamManager: Création composants UI...');
    
    // Créer TeamUI
    if (!this.teamUI) {
      this.teamUI = new TeamUI(this.gameRoom);
      console.log('✅ TeamUI créé');
    }
    
    // Créer TeamIcon SEULEMENT si pas déjà présent
    const existingIcon = document.querySelector('#team-icon');
    if (!existingIcon && !this.teamIcon) {
      this.teamIcon = new TeamIcon(this.teamUI);
      console.log('✅ TeamIcon créé');
      
      // Afficher l'icône après un court délai
      setTimeout(() => {
        if (this.teamIcon && !this.isDestroyed) {
          this.teamIcon.show();
        }
      }, 200);
    } else if (existingIcon) {
      console.log('ℹ️ Icône team déjà présente, réutilisation');
      // Juste s'assurer qu'elle est visible
      existingIcon.style.display = '';
      existingIcon.classList.remove('hidden');
    }
  }

  // ✅ LISTENERS SIMPLIFIÉS - sans callbacks complexes
  setupServerListeners() {
    if (!this.gameRoom) {
      console.error('❌ Pas de gameRoom pour listeners');
      return;
    }

    console.log('🔧 TeamManager: Setup listeners...');

    try {
      // Listener principal pour données d'équipe
      this.gameRoom.onMessage("teamData", (data) => {
        this.handleTeamData(data);
      });

      // Listeners pour actions
      this.gameRoom.onMessage("teamActionResult", (data) => {
        this.handleActionResult(data);
      });

      this.gameRoom.onMessage("teamHealed", (data) => {
        this.handleTeamHealed(data);
      });

      console.log('✅ Listeners configurés');

    } catch (error) {
      console.error('❌ Erreur setup listeners:', error);
    }
  }

  // ✅ SETUP GLOBAL SIMPLIFIÉ
  setupGlobalReferences() {
    // Raccourci global T
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          this.canInteract()) {
        e.preventDefault();
        this.toggleTeamUI();
      }
    });

    // Références globales
    window.isTeamOpen = () => this.teamUI?.isOpen() || false;
    window.TeamManager = this;
    window.teamManagerGlobal = this;
  }

  // ✅ HANDLERS SIMPLIFIÉS
  handleTeamData(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Données équipe reçues:', data);
      
      this.teamData = Array.isArray(data.team) ? data.team : [];
      this.calculateStats();
      
      if (this.teamUI && this.teamUI.updateTeamData) {
        this.teamUI.updateTeamData(data);
      }
      
      if (this.teamIcon && this.teamIcon.updateTeamStats) {
        this.teamIcon.updateTeamStats(this.teamStats);
      }
      
    } catch (error) {
      console.error('❌ Erreur handleTeamData:', error);
    }
  }

  handleActionResult(data) {
    if (this.isDestroyed) return;
    
    if (data.success) {
      this.showNotification(data.message || 'Action réussie', 'success');
      this.requestTeamData(); // Refresh
    } else {
      this.showNotification(data.message || 'Action échouée', 'error');
    }
  }

  handleTeamHealed(data) {
    if (this.isDestroyed) return;
    
    this.showNotification('Équipe soignée!', 'success');
    this.requestTeamData();
  }

  // ✅ MÉTHODES PUBLIQUES SIMPLIFIÉES
  toggleTeamUI() {
    if (this.isDestroyed || !this.isInitialized || !this.canInteract()) {
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

  // ✅ ACTIONS RÉSEAU SIMPLIFIÉES
  requestTeamData() {
    if (this.isDestroyed || !this.gameRoom) return;
    
    try {
      this.gameRoom.send("getTeam");
    } catch (error) {
      console.error('❌ Erreur requestTeamData:', error);
    }
  }

  healTeam() {
    if (this.safeSend("healTeam")) {
      this.showNotification('Demande de soin envoyée...', 'info');
    }
  }

  healPokemon(pokemonId) {
    this.safeSend("healPokemon", { pokemonId });
  }

  removePokemon(pokemonId) {
    this.safeSend("removeFromTeam", { pokemonId });
  }

  swapPokemon(fromSlot, toSlot) {
    this.safeSend("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
  }

  // ✅ UTILITAIRES
  safeSend(messageType, data = {}) {
    if (this.isDestroyed || !this.gameRoom) return false;
    
    try {
      this.gameRoom.send(messageType, data);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi ${messageType}:`, error);
      return false;
    }
  }

  calculateStats() {
    if (this.isDestroyed) return;
    
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

  canInteract() {
    if (!this.isInitialized || this.isDestroyed) return false;
    
    try {
      const dialogOpen = document.querySelector('.quest-dialog-overlay, #dialogue-box') !== null;
      const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
      const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
      
      return !dialogOpen && !chatOpen && !inventoryOpen;
    } catch (error) {
      return false;
    }
  }

  showNotification(message, type = 'info') {
    try {
      if (typeof window.showGameNotification === 'function') {
        window.showGameNotification(message, type);
      } else {
        console.log(`📢 [${type}]: ${message}`);
      }
    } catch (error) {
      console.error('❌ Erreur notification:', error);
    }
  }

  // ✅ GETTERS
  getTeamData() {
    return [...this.teamData];
  }

  getTeamStats() {
    return { ...this.teamStats };
  }

  isTeamOpen() {
    return this.teamUI?.isOpen() || false;
  }

  // ✅ DESTROY SIMPLIFIÉE - CONSERVATION POUR TRANSITIONS
  destroy(keepForTransition = false) {
    if (this.isDestroyed) {
      return;
    }

    console.log('⚔️ TeamManager: Destruction...');
    
    this.isDestroyed = true;
    this.isInitialized = false;

    // ✅ SI C'EST POUR UNE TRANSITION, GARDER L'UI
    if (keepForTransition) {
      console.log('🔄 TeamManager: Conservation pour transition');
      // Juste marquer comme détruit mais garder les composants
      return;
    }

    // ✅ DESTRUCTION COMPLÈTE
    try {
      if (this.teamUI) {
        this.teamUI.destroy?.();
        this.teamUI = null;
      }
    } catch (error) {
      console.warn('⚠️ Erreur destruction TeamUI:', error);
    }
    
    try {
      if (this.teamIcon) {
        this.teamIcon.destroy?.();
        this.teamIcon = null;
      }
    } catch (error) {
      console.warn('⚠️ Erreur destruction TeamIcon:', error);
    }
    
    try {
      const iconElement = document.querySelector('#team-icon');
      if (iconElement) {
        iconElement.remove();
      }
    } catch (error) {
      console.warn('⚠️ Erreur suppression DOM:', error);
    }
    
    // Nettoyer les références globales
    if (window.TeamManager === this) {
      window.TeamManager = null;
    }
    if (window.teamManagerGlobal === this) {
      window.teamManagerGlobal = null;
    }
    
    this.teamData = [];
    this.gameRoom = null;
    
    console.log('✅ TeamManager: Détruit');
  }

  // ✅ NOUVELLE MÉTHODE: Restaurer après transition
  restore(newGameRoom) {
    if (!this.isDestroyed) {
      console.warn('⚠️ TeamManager: Pas détruit, pas besoin de restore');
      return;
    }

    console.log('🔄 TeamManager: Restauration après transition...');
    
    this.gameRoom = newGameRoom;
    this.isDestroyed = false;
    this.isInitialized = false;
    
    // Réinitialiser
    this.init();
  }

  // ✅ DEBUG
  debugState() {
    console.log('🔍 TeamManager Debug:', {
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      teamCount: this.teamData.length,
      hasTeamUI: !!this.teamUI,
      hasTeamIcon: !!this.teamIcon,
      iconInDOM: !!document.querySelector('#team-icon'),
      canInteract: this.canInteract()
    });
  }
}

// ✅ FONCTION D'INITIALISATION SIMPLIFIÉE
export async function initializeTeamSystem(gameRoom) {
  console.log('🔧 === INIT TEAM SYSTEM SIMPLIFIÉ ===');
  
  // ✅ VÉRIFIER SI DÉJÀ INITIALISÉ ET FONCTIONNEL
  if (window.TeamManager && window.TeamManager.isInitialized && !window.TeamManager.isDestroyed) {
    console.log('ℹ️ TeamManager déjà initialisé et fonctionnel');
    
    // Juste mettre à jour la gameRoom si différente
    if (window.TeamManager.gameRoom !== gameRoom) {
      window.TeamManager.gameRoom = gameRoom;
      window.TeamManager.setupServerListeners();
    }
    
    return window.TeamManager;
  }
  
  // ✅ NETTOYER L'ANCIEN SEULEMENT SI VRAIMENT CASSÉ
  if (window.TeamManager && (window.TeamManager.isDestroyed || !window.TeamManager.isInitialized)) {
    console.log('🧹 Nettoyage ancien TeamManager cassé...');
    try {
      window.TeamManager.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction ancien:', error);
    }
    window.TeamManager = null;
  }
  
  if (!gameRoom) {
    console.error('❌ initializeTeamSystem: Pas de gameRoom');
    return null;
  }

  try {
    console.log('🚀 Création nouveau TeamManager...');
    
    const teamManager = new TeamManager(gameRoom);
    
    const success = await teamManager.init();
    
    if (success) {
      window.TeamManager = teamManager;
      window.teamManagerGlobal = teamManager;
      
      console.log('✅ TeamManager initialisé avec succès');
      return teamManager;
    } else {
      console.error('❌ Échec initialisation');
      teamManager.destroy();
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erreur initializeTeamSystem:', error);
    return null;
  }
}

export default TeamManager;
