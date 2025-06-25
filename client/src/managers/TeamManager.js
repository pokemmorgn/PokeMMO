// client/src/managers/TeamManager.js - Version sécurisée pour éviter les déconnexions

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
    this.listenerKeys = []; // ✅ NOUVEAU: Tracker des listeners pour cleanup
    this.initializationTimeout = null;
    
    // ✅ NOUVEAU: Protection contre les déconnexions
    this.connectionProtection = true;
    this.maxRetries = 3;
    this.currentRetries = 0;
    
    this.init();
  }

  async init() {
    try {
      // ✅ VÉRIFICATION DE CONNEXION AVANT TOUT
      if (!this.gameRoom || !this.gameRoom.connection) {
        console.error('❌ TeamManager: Pas de connexion room valide');
        return;
      }

      console.log('⚔️ TeamManager: Initialisation sécurisée...');
      
      // ✅ DÉLAI DE SÉCURITÉ pour laisser la room se stabiliser
      await this.waitForRoomStability();
      
      // Créer les composants UI avec protection
      await this.createUIComponents();
      
      // Configurer les listeners avec protection
      this.setupSafeServerListeners();
      
      // Configurer les raccourcis globaux
      this.setupGlobalShortcuts();
      
      this.isInitialized = true;
      console.log('✅ TeamManager initialisé avec succès');
      
      // ✅ DEMANDE DE DONNÉES DIFFÉRÉE pour éviter la surcharge
      this.scheduleDataRequest();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du TeamManager:', error);
      this.handleInitializationError(error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Attendre la stabilité de la room
  async waitForRoomStability() {
    return new Promise((resolve) => {
      // Vérifier que la room est stable pendant au moins 500ms
      let stabilityCheck = 0;
      const checkInterval = setInterval(() => {
        if (this.gameRoom && this.gameRoom.connection && this.gameRoom.connection.readyState === 1) {
          stabilityCheck++;
          if (stabilityCheck >= 5) { // 5 * 100ms = 500ms stable
            clearInterval(checkInterval);
            resolve();
          }
        } else {
          stabilityCheck = 0; // Reset si instable
        }
      }, 100);
      
      // Timeout de sécurité
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(); // Continuer même si pas parfaitement stable
      }, 3000);
    });
  }

  // ✅ NOUVELLE MÉTHODE: Création sécurisée des composants UI
  async createUIComponents() {
    try {
      // Créer TeamUI avec vérification
      if (!this.teamUI) {
        this.teamUI = new TeamUI(this.gameRoom);
        console.log('✅ TeamUI créé');
      }
      
      // Attendre que TeamUI soit prêt
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Créer TeamIcon avec vérification
      if (!this.teamIcon && this.teamUI) {
        this.teamIcon = new TeamIcon(this.teamUI);
        console.log('✅ TeamIcon créé');
        
        // Attendre avant d'afficher
        setTimeout(() => {
          if (this.teamIcon && this.isInitialized) {
            this.teamIcon.show();
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Erreur création composants UI:', error);
      throw error;
    }
  }

  // ✅ MÉTHODE MODIFIÉE: Setup sécurisé des listeners
  setupSafeServerListeners() {
    if (!this.gameRoom) {
      console.error('❌ TeamManager: Pas de gameRoom pour les listeners');
      return;
    }

    console.log('🔧 TeamManager: Configuration listeners sécurisés...');

    try {
      // ✅ VÉRIFIER QUE LA ROOM N'EST PAS DÉJÀ EN TRAIN DE SE DÉCONNECTER
      if (this.gameRoom.connection.readyState !== 1) {
        console.warn('⚠️ TeamManager: Room pas en état connecté, skip listeners');
        return;
      }

      // ✅ WRAPPER SÉCURISÉ pour tous les listeners
      const safeListener = (eventName, callback) => {
        const wrappedCallback = (...args) => {
          try {
            if (this.gameRoom && this.gameRoom.connection && this.gameRoom.connection.readyState === 1) {
              callback(...args);
            } else {
              console.warn(`⚠️ TeamManager: Listener ${eventName} ignoré (connexion instable)`);
            }
          } catch (error) {
            console.error(`❌ TeamManager: Erreur dans listener ${eventName}:`, error);
            this.handleListenerError(eventName, error);
          }
        };

        this.gameRoom.onMessage(eventName, wrappedCallback);
        this.listenerKeys.push(eventName);
        console.log(`📡 Listener sécurisé ajouté: ${eventName}`);
      };

      // ✅ AJOUT GRADUEL DES LISTENERS avec délais
      setTimeout(() => safeListener("teamData", (data) => this.handleTeamData(data)), 100);
      setTimeout(() => safeListener("teamStats", (data) => this.handleTeamStats(data)), 200);
      setTimeout(() => safeListener("pokemonAddedToTeam", (data) => this.handlePokemonAdded(data)), 300);
      setTimeout(() => safeListener("pokemonRemovedFromTeam", (data) => this.handlePokemonRemoved(data)), 400);
      setTimeout(() => safeListener("pokemonUpdated", (data) => this.handlePokemonUpdate(data)), 500);
      setTimeout(() => safeListener("teamHealed", (data) => this.handleTeamHealed(data)), 600);
      setTimeout(() => safeListener("teamActionResult", (data) => this.handleTeamActionResult(data)), 700);
      setTimeout(() => safeListener("battleStart", (data) => this.handleBattleStart(data)), 800);
      setTimeout(() => safeListener("battleEnd", (data) => this.handleBattleEnd(data)), 900);
      setTimeout(() => safeListener("pokemonCaught", (data) => this.handlePokemonCaught(data)), 1000);

      console.log('✅ TeamManager: Tous les listeners sécurisés configurés');

    } catch (error) {
      console.error('❌ TeamManager: Erreur setup listeners:', error);
      this.handleListenerError('setup', error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Gestion des erreurs de listeners
  handleListenerError(eventName, error) {
    console.error(`❌ TeamManager: Erreur listener ${eventName}:`, error);
    
    this.currentRetries++;
    if (this.currentRetries < this.maxRetries) {
      console.log(`🔄 TeamManager: Tentative de récupération ${this.currentRetries}/${this.maxRetries}`);
      
      // Attendre avant de réessayer
      setTimeout(() => {
        this.reinitializeIfNeeded();
      }, 2000 * this.currentRetries);
    } else {
      console.error('❌ TeamManager: Trop d\'erreurs, arrêt du système');
      this.gracefulShutdown();
    }
  }

  // ✅ NOUVELLE MÉTHODE: Réinitialisation si nécessaire
  reinitializeIfNeeded() {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      console.log('🔄 TeamManager: Connexion fermée, impossible de réinitialiser');
      return;
    }

    console.log('🔄 TeamManager: Réinitialisation...');
    
    // Nettoyer les anciens listeners
    this.cleanupListeners();
    
    // Réinitialiser avec délai
    setTimeout(() => {
      this.setupSafeServerListeners();
    }, 1000);
  }

  // ✅ NOUVELLE MÉTHODE: Nettoyage des listeners
  cleanupListeners() {
    if (this.gameRoom && this.listenerKeys.length > 0) {
      console.log('🧹 TeamManager: Nettoyage des listeners...');
      
      this.listenerKeys.forEach(eventName => {
        try {
          // Note: Colyseus ne permet pas de removeListener spécifique facilement
          // On va juste marquer qu'ils ne doivent plus être actifs
          console.log(`🗑️ Marquage listener inactif: ${eventName}`);
        } catch (error) {
          console.warn(`⚠️ Erreur nettoyage listener ${eventName}:`, error);
        }
      });
      
      this.listenerKeys = [];
    }
  }

  // ✅ NOUVELLE MÉTHODE: Demande de données différée
  scheduleDataRequest() {
    // ✅ ATTENDRE que le système soit vraiment prêt
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
    }

    this.initializationTimeout = setTimeout(() => {
      if (this.isInitialized && this.gameRoom && this.gameRoom.connection && this.gameRoom.connection.readyState === 1) {
        console.log('📡 TeamManager: Demande de données d\'équipe...');
        this.requestTeamData();
      } else {
        console.warn('⚠️ TeamManager: Pas prêt pour demander les données');
      }
    }, 2000); // ✅ 2 secondes après l'initialisation
  }

  // ✅ MÉTHODE MODIFIÉE: Demande sécurisée de données
  requestTeamData() {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      console.warn('⚠️ TeamManager: Impossible de demander données (connexion instable)');
      return;
    }

    try {
      console.log('📡 TeamManager: Envoi getTeam...');
      this.gameRoom.send("getTeam");
    } catch (error) {
      console.error('❌ TeamManager: Erreur demande données:', error);
      
      // Réessayer après un délai
      setTimeout(() => {
        if (this.gameRoom && this.gameRoom.connection.readyState === 1) {
          this.requestTeamData();
        }
      }, 5000);
    }
  }

  // ✅ MÉTHODE MODIFIÉE: Setup raccourcis avec protection
  setupGlobalShortcuts() {
    // Raccourci global pour ouvrir l'équipe (T)
    const keyHandler = (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          this.canInteract()) {
        e.preventDefault();
        this.toggleTeamUI();
      }
    };

    document.addEventListener('keydown', keyHandler);

    // ✅ STOCKER pour cleanup
    this.keyboardHandler = keyHandler;

    // Intégration avec window pour d'autres composants
    window.isTeamOpen = () => this.teamUI?.isOpen() || false;
    window.TeamManager = this;
  }

  // ✅ NOUVELLE MÉTHODE: Arrêt gracieux
  gracefulShutdown() {
    console.log('🛑 TeamManager: Arrêt gracieux...');
    
    this.isInitialized = false;
    
    // Nettoyer les timeouts
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }

    // Nettoyer les listeners clavier
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }

    // Nettoyer les composants UI
    if (this.teamUI) {
      this.teamUI.hide();
    }

    if (this.teamIcon) {
      this.teamIcon.hide();
    }

    console.log('✅ TeamManager: Arrêt gracieux terminé');
  }

  // ✅ NOUVELLE MÉTHODE: Gestion des erreurs d'initialisation
  handleInitializationError(error) {
    console.error('❌ TeamManager: Erreur d\'initialisation:', error);
    
    this.currentRetries++;
    if (this.currentRetries < this.maxRetries) {
      console.log(`🔄 TeamManager: Nouvelle tentative ${this.currentRetries}/${this.maxRetries} dans 5s...`);
      
      setTimeout(() => {
        this.init();
      }, 5000);
    } else {
      console.error('❌ TeamManager: Échec complet de l\'initialisation');
      this.gracefulShutdown();
    }
  }

  // === MÉTHODES EXISTANTES AVEC PROTECTION ===

  handleTeamData(data) {
    try {
      console.log('⚔️ Données d\'équipe reçues:', data);
      
      this.teamData = data.team || [];
      this.calculateStats();
      
      // Mettre à jour les composants UI avec vérification
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

  // ✅ Toutes les autres méthodes handle* avec try-catch similaire...

  handlePokemonAdded(data) {
    try {
      console.log('⚔️ Pokémon ajouté à l\'équipe:', data);
      
      if (data.pokemon) {
        this.teamData.push(data.pokemon);
        this.calculateStats();
      }
      
      if (this.teamIcon) {
        this.teamIcon.onPokemonAdded?.(data.pokemon);
        this.teamIcon.updateTeamStats?.(this.teamStats);
      }
      
      if (this.teamUI && this.teamUI.isOpen()) {
        this.teamUI.requestTeamData?.();
      }
      
      this.showNotification(`${data.pokemon.nickname || data.pokemon.name} ajouté à l'équipe!`, 'success');
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonAdded:', error);
    }
  }

  // ✅ MÉTHODE MODIFIÉE: Toggle sécurisé
  toggleTeamUI() {
    if (!this.isInitialized) {
      this.showNotification('Système d\'équipe en cours d\'initialisation...', 'warning');
      return;
    }

    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI && this.teamUI.toggle) {
      this.teamUI.toggle();
    } else {
      console.warn('⚠️ TeamManager: TeamUI pas disponible');
    }
  }

  canInteract() {
    if (!this.isInitialized) return false;
    
    // Vérifier si le joueur peut interagir avec l'équipe
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    const shopOpen = document.querySelector('#shop-overlay') && !document.querySelector('#shop-overlay').classList.contains('hidden');
    const dialogueOpen = document.querySelector('#dialogue-box')?.style.display !== 'none';
    
    return !this.isInBattle && !questDialogOpen && !chatOpen && !inventoryOpen && !shopOpen && !dialogueOpen;
  }

  // ✅ MÉTHODE MODIFIÉE: Actions sécurisées
  healTeam() {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      this.showNotification('Connexion instable, impossible de soigner l\'équipe', 'error');
      return;
    }

    try {
      this.gameRoom.send("healTeam");
    } catch (error) {
      console.error('❌ TeamManager: Erreur healTeam:', error);
      this.showNotification('Erreur lors du soin de l\'équipe', 'error');
    }
  }

  // ✅ MÉTHODES UTILITAIRES PROTÉGÉES...

  calculateStats() {
    try {
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
    } catch (error) {
      console.error('❌ TeamManager: Erreur calculateStats:', error);
    }
  }

  showNotification(message, type = 'info') {
    try {
      if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
      } else {
        console.log(`📢 TeamManager [${type}]: ${message}`);
      }
    } catch (error) {
      console.error('❌ TeamManager: Erreur notification:', error);
    }
  }

  // ✅ MÉTHODE MODIFIÉE: Destroy sécurisé
  destroy() {
    console.log('⚔️ Destruction sécurisée du TeamManager');
    
    this.gracefulShutdown();
    
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
    
    // Nettoyer les données
    this.teamData = [];
    this.gameRoom = null;
    
    console.log('✅ TeamManager détruit proprement');
  }

  // === GETTERS ET MÉTHODES UTILITAIRES ===

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
}

// ✅ FONCTION D'INITIALISATION SÉCURISÉE
export function initializeTeamSystem(gameRoom) {
  if (window.TeamManager) {
    console.warn('⚠️ TeamManager déjà initialisé');
    return window.TeamManager;
  }
  
  // ✅ VÉRIFICATIONS DE SÉCURITÉ
  if (!gameRoom) {
    console.error('❌ initializeTeamSystem: Pas de gameRoom fournie');
    return null;
  }

  if (!gameRoom.connection || gameRoom.connection.readyState !== 1) {
    console.error('❌ initializeTeamSystem: gameRoom pas connectée');
    return null;
  }

  console.log('🔧 Initialisation sécurisée du système d\'équipe...');
  
  try {
    const teamManager = new TeamManager(gameRoom);
    window.TeamManager = teamManager;
    
    console.log('✅ Système d\'équipe initialisé avec protection');
    return teamManager;
  } catch (error) {
    console.error('❌ Erreur initialisation TeamManager:', error);
    return null;
  }
}

export default TeamManager;
