// client/src/managers/TeamManager.js - Version complète corrigée avec stabilité renforcée

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
    this.listenerKeys = [];
    this.initializationTimeout = null;
    
    // ✅ AMÉLIORATION: Protection renforcée contre les déconnexions
    this.connectionProtection = true;
    this.maxRetries = 5;
    this.currentRetries = 0;
    this.initializationDelay = 5000;
    this.connectionCheckInterval = null;
    
    // ✅ NOUVEAU: État de la connexion
    this.connectionState = 'checking';
    this.stabilityChecks = 0;
    this.requiredStabilityChecks = 10;
    
    this.init();
  }

  async init() {
    try {
      console.log('⚔️ TeamManager: Initialisation améliorée...');
      
      // ✅ ÉTAPE 1: Vérification de connexion approfondie
      const connectionReady = await this.verifyConnectionStability();
      if (!connectionReady) {
        throw new Error('Connexion room instable');
      }

      // ✅ ÉTAPE 2: Attendre la stabilité complète
      await this.waitForCompleteStability();
      
      // ✅ ÉTAPE 3: Créer les composants UI avec protection
      await this.createUIComponentsSafely();
      
      // ✅ ÉTAPE 4: Configurer les listeners avec vérifications renforcées
      this.setupStabilizedServerListeners();
      
      // ✅ ÉTAPE 5: Configurer la surveillance continue
      this.setupContinuousMonitoring();
      
      // ✅ ÉTAPE 6: Raccourcis globaux
      this.setupGlobalShortcuts();
      
      this.isInitialized = true;
      console.log('✅ TeamManager initialisé avec protection renforcée');
      
      // ✅ ÉTAPE 7: Demande de données après stabilisation complète
      this.scheduleStabilizedDataRequest();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du TeamManager:', error);
      this.handleInitializationError(error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vérification de stabilité de connexion approfondie
  async verifyConnectionStability() {
    console.log('🔍 TeamManager: Vérification stabilité connexion...');
    
    if (!this.gameRoom || !this.gameRoom.connection) {
      console.error('❌ TeamManager: Pas de connexion room valide');
      return false;
    }

    if (this.gameRoom.connection.readyState !== 1) {
      console.warn('⚠️ TeamManager: WebSocket pas en état OPEN');
      return false;
    }

    return new Promise((resolve) => {
      let checks = 0;
      const maxChecks = 20;
      
      const checkStability = () => {
        if (!this.gameRoom || !this.gameRoom.connection) {
          resolve(false);
          return;
        }
        
        if (this.gameRoom.connection.readyState === 1) {
          checks++;
          if (checks >= 10) {
            console.log('✅ TeamManager: Connexion vérifiée stable');
            resolve(true);
            return;
          }
        } else {
          checks = 0;
        }
        
        if (checks < maxChecks) {
          setTimeout(checkStability, 100);
        } else {
          console.warn('⚠️ TeamManager: Timeout vérification stabilité');
          resolve(false);
        }
      };
      
      checkStability();
    });
  }

  // ✅ NOUVELLE MÉTHODE: Attendre la stabilité complète
  async waitForCompleteStability() {
    console.log('⏳ TeamManager: Attente stabilité complète...');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        if (window.globalNetworkManager?.isConnected && 
            window.globalNetworkManager.room?.connection?.readyState === 1) {
          console.log('✅ TeamManager: Stabilité complète atteinte');
          resolve();
        } else {
          console.warn('⚠️ TeamManager: Stabilité incomplète, mais continuation...');
          resolve();
        }
      }, this.initializationDelay);
    });
  }

  // ✅ MÉTHODE AMÉLIORÉE: Création sécurisée des composants UI
  async createUIComponentsSafely() {
    try {
      console.log('🎨 TeamManager: Création composants UI sécurisée...');
      
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve, { once: true });
          }
        });
      }
      
      if (!this.teamUI) {
        try {
          this.teamUI = new TeamUI(this.gameRoom);
          console.log('✅ TeamUI créé avec succès');
          
          if (!this.teamUI.overlay) {
            throw new Error('TeamUI overlay manquant');
          }
          
        } catch (error) {
          console.error('❌ Erreur création TeamUI:', error);
          throw error;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!this.teamIcon && this.teamUI) {
        try {
          this.teamIcon = new TeamIcon(this.teamUI);
          console.log('✅ TeamIcon créé avec succès');
          
          if (!this.teamIcon.iconElement) {
            throw new Error('TeamIcon element manquant');
          }
          
          setTimeout(() => {
            if (this.teamIcon && this.isInitialized) {
              try {
                this.teamIcon.show();
                console.log('✅ TeamIcon affiché');
              } catch (error) {
                console.error('❌ Erreur affichage TeamIcon:', error);
              }
            }
          }, 1000);
          
        } catch (error) {
          console.error('❌ Erreur création TeamIcon:', error);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur création composants UI:', error);
      throw error;
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE: Setup listeners avec stabilité renforcée
  setupStabilizedServerListeners() {
    if (!this.gameRoom) {
      console.error('❌ TeamManager: Pas de gameRoom pour les listeners');
      return;
    }

    console.log('🔧 TeamManager: Configuration listeners stabilisés...');

    try {
      if (this.gameRoom.connection.readyState !== 1) {
        console.warn('⚠️ TeamManager: Room pas connectée, skip listeners');
        setTimeout(() => {
          if (this.gameRoom && this.gameRoom.connection.readyState === 1) {
            this.setupStabilizedServerListeners();
          }
        }, 2000);
        return;
      }

      const ultraSafeListener = (eventName, callback) => {
        const wrappedCallback = (...args) => {
          try {
            if (!this.gameRoom || !this.gameRoom.connection) {
              console.warn(`⚠️ TeamManager: Listener ${eventName} - room manquante`);
              return;
            }
            
            if (this.gameRoom.connection.readyState !== 1) {
              console.warn(`⚠️ TeamManager: Listener ${eventName} - connexion fermée`);
              return;
            }
            
            if (!this.isInitialized) {
              console.warn(`⚠️ TeamManager: Listener ${eventName} - manager non initialisé`);
              return;
            }
            
            callback(...args);
            
          } catch (error) {
            console.error(`❌ TeamManager: Erreur dans listener ${eventName}:`, error);
            this.handleListenerError(eventName, error);
          }
        };

        try {
          this.gameRoom.onMessage(eventName, wrappedCallback);
          this.listenerKeys.push(eventName);
          console.log(`📡 Listener ultra-sécurisé ajouté: ${eventName}`);
        } catch (error) {
          console.error(`❌ Erreur ajout listener ${eventName}:`, error);
        }
      };

      const listenerConfigs = [
        { name: "teamData", handler: (data) => this.handleTeamData(data), delay: 200 },
        { name: "teamStats", handler: (data) => this.handleTeamStats(data), delay: 400 },
        { name: "pokemonAddedToTeam", handler: (data) => this.handlePokemonAdded(data), delay: 600 },
        { name: "pokemonRemovedFromTeam", handler: (data) => this.handlePokemonRemoved(data), delay: 800 },
        { name: "pokemonUpdated", handler: (data) => this.handlePokemonUpdate(data), delay: 1000 },
        { name: "teamHealed", handler: (data) => this.handleTeamHealed(data), delay: 1200 },
        { name: "teamActionResult", handler: (data) => this.handleTeamActionResult(data), delay: 1400 },
        { name: "battleStart", handler: (data) => this.handleBattleStart(data), delay: 1600 },
        { name: "battleEnd", handler: (data) => this.handleBattleEnd(data), delay: 1800 },
        { name: "pokemonCaught", handler: (data) => this.handlePokemonCaught(data), delay: 2000 }
      ];

      listenerConfigs.forEach(config => {
        setTimeout(() => {
          if (this.isInitialized && this.gameRoom?.connection?.readyState === 1) {
            ultraSafeListener(config.name, config.handler);
          }
        }, config.delay);
      });

      console.log('✅ TeamManager: Tous les listeners stabilisés programmés');

    } catch (error) {
      console.error('❌ TeamManager: Erreur setup listeners:', error);
      this.handleListenerError('setup', error);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Surveillance continue de la connexion
  setupContinuousMonitoring() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 5000);

    console.log('👁️ TeamManager: Surveillance continue activée');
  }

  // ✅ NOUVELLE MÉTHODE: Vérification de santé de connexion
  checkConnectionHealth() {
    if (!this.gameRoom || !this.gameRoom.connection) {
      console.warn('⚠️ TeamManager: Connexion perdue lors de la surveillance');
      this.handleConnectionLoss();
      return;
    }

    if (this.gameRoom.connection.readyState !== 1) {
      console.warn('⚠️ TeamManager: Connexion instable détectée');
      this.handleConnectionInstability();
      return;
    }

    if (this.currentRetries > 0) {
      console.log('✅ TeamManager: Connexion récupérée, reset compteurs');
      this.currentRetries = 0;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Gestion de perte de connexion
  handleConnectionLoss() {
    console.error('💥 TeamManager: Perte de connexion détectée');
    this.gracefulShutdown();
  }

  // ✅ NOUVELLE MÉTHODE: Gestion d'instabilité de connexion
  handleConnectionInstability() {
    console.warn('⚠️ TeamManager: Instabilité de connexion');
    
    if (this.teamIcon) {
      this.teamIcon.setEnabled(false);
    }
    
    setTimeout(() => {
      if (this.gameRoom?.connection?.readyState === 1 && this.teamIcon) {
        this.teamIcon.setEnabled(true);
        console.log('✅ TeamManager: Interactions réactivées');
      }
    }, 3000);
  }

  // ✅ MÉTHODE AMÉLIORÉE: Demande de données stabilisée
  scheduleStabilizedDataRequest() {
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
    }

    this.initializationTimeout = setTimeout(() => {
      if (this.isInitialized && 
          this.gameRoom && 
          this.gameRoom.connection && 
          this.gameRoom.connection.readyState === 1) {
        
        console.log('📡 TeamManager: Demande de données d\'équipe stabilisée...');
        this.requestTeamDataSafely();
        
      } else {
        console.warn('⚠️ TeamManager: Pas prêt pour demander les données, nouvelle tentative...');
        this.scheduleStabilizedDataRequest();
      }
    }, 3000);
  }

  // ✅ NOUVELLE MÉTHODE: Demande de données ultra-sécurisée
  requestTeamDataSafely() {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      console.warn('⚠️ TeamManager: Impossible de demander données (connexion instable)');
      return;
    }

    try {
      console.log('📡 TeamManager: Envoi getTeam sécurisé...');
      
      const requestTimeout = setTimeout(() => {
        console.warn('⚠️ TeamManager: Timeout demande team data');
      }, 10000);

      this.gameRoom.send("getTeam");
      
      const originalHandler = this.handleTeamData.bind(this);
      this.handleTeamData = (data) => {
        clearTimeout(requestTimeout);
        this.handleTeamData = originalHandler;
        originalHandler(data);
      };
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur demande données:', error);
      
      setTimeout(() => {
        if (this.gameRoom && this.gameRoom.connection.readyState === 1) {
          this.requestTeamDataSafely();
        }
      }, 10000);
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE: Gestion des erreurs de listeners
  handleListenerError(eventName, error) {
    console.error(`❌ TeamManager: Erreur listener ${eventName}:`, error);
    
    this.currentRetries++;
    if (this.currentRetries < this.maxRetries) {
      console.log(`🔄 TeamManager: Tentative de récupération ${this.currentRetries}/${this.maxRetries}`);
      
      const retryDelay = Math.min(2000 * Math.pow(2, this.currentRetries - 1), 30000);
      
      setTimeout(() => {
        this.reinitializeIfNeeded();
      }, retryDelay);
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
    
    this.cleanupListeners();
    
    setTimeout(() => {
      this.setupStabilizedServerListeners();
    }, 1000);
  }

  // ✅ NOUVELLE MÉTHODE: Nettoyage des listeners
  cleanupListeners() {
    if (this.gameRoom && this.listenerKeys.length > 0) {
      console.log('🧹 TeamManager: Nettoyage des listeners...');
      
      this.listenerKeys.forEach(eventName => {
        try {
          console.log(`🗑️ Marquage listener inactif: ${eventName}`);
        } catch (error) {
          console.warn(`⚠️ Erreur nettoyage listener ${eventName}:`, error);
        }
      });
      
      this.listenerKeys = [];
    }
  }

  // ✅ MÉTHODES HANDLE* AMÉLIORÉES avec protection d'erreur
  handleTeamData(data) {
    try {
      console.log('⚔️ Données d\'équipe reçues:', data);
      
      if (!data || typeof data !== 'object') {
        console.warn('⚠️ TeamManager: Données d\'équipe invalides');
        return;
      }
      
      this.teamData = Array.isArray(data.team) ? data.team : [];
      this.calculateStats();
      
      if (this.teamUI && typeof this.teamUI.updateTeamData === 'function') {
        this.teamUI.updateTeamData(data);
      }
      
      if (this.teamIcon && typeof this.teamIcon.updateTeamStats === 'function') {
        this.teamIcon.updateTeamStats(this.teamStats);
      }
      
      console.log('✅ TeamManager: Données d\'équipe traitées avec succès');
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamData:', error);
    }
  }

  handleTeamStats(data) {
    try {
      console.log('⚔️ Statistiques d\'équipe reçues:', data);
      
      if (!data || typeof data !== 'object') {
        console.warn('⚠️ TeamManager: Statistiques d\'équipe invalides');
        return;
      }
      
      this.teamStats = { ...this.teamStats, ...data };
      
      if (this.teamIcon && typeof this.teamIcon.updateTeamStats === 'function') {
        this.teamIcon.updateTeamStats(this.teamStats);
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamStats:', error);
    }
  }

  handlePokemonAdded(data) {
    try {
      console.log('⚔️ Pokémon ajouté à l\'équipe:', data);
      
      if (!data || !data.pokemon) {
        console.warn('⚠️ TeamManager: Données pokemon ajouté invalides');
        return;
      }
      
      this.teamData.push(data.pokemon);
      this.calculateStats();
      
      if (this.teamIcon) {
        if (typeof this.teamIcon.onPokemonAdded === 'function') {
          this.teamIcon.onPokemonAdded(data.pokemon);
        }
        if (typeof this.teamIcon.updateTeamStats === 'function') {
          this.teamIcon.updateTeamStats(this.teamStats);
        }
      }
      
      if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
        if (typeof this.teamUI.requestTeamData === 'function') {
          this.teamUI.requestTeamData();
        }
      }
      
      this.showNotification(`${data.pokemon.nickname || data.pokemon.name} ajouté à l'équipe!`, 'success');
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonAdded:', error);
    }
  }

  handlePokemonRemoved(data) {
    try {
      console.log('⚔️ Pokémon retiré de l\'équipe:', data);
      
      if (!data || !data.pokemonId) {
        console.warn('⚠️ TeamManager: Données pokemon retiré invalides');
        return;
      }
      
      this.teamData = this.teamData.filter(p => p._id !== data.pokemonId);
      this.calculateStats();
      
      if (this.teamIcon) {
        if (typeof this.teamIcon.onPokemonRemoved === 'function') {
          this.teamIcon.onPokemonRemoved();
        }
        if (typeof this.teamIcon.updateTeamStats === 'function') {
          this.teamIcon.updateTeamStats(this.teamStats);
        }
      }
      
      if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
        if (typeof this.teamUI.requestTeamData === 'function') {
          this.teamUI.requestTeamData();
        }
      }
      
      this.showNotification('Pokémon retiré de l\'équipe', 'info');
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonRemoved:', error);
    }
  }

  handlePokemonUpdate(data) {
    try {
      console.log('⚔️ Pokémon mis à jour:', data);
      
      if (!data || !data.pokemonId) {
        console.warn('⚠️ TeamManager: Données pokemon update invalides');
        return;
      }
      
      const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
      if (pokemonIndex !== -1) {
        this.teamData[pokemonIndex] = { ...this.teamData[pokemonIndex], ...data.updates };
        this.calculateStats();
        
        if (this.teamIcon && typeof this.teamIcon.updateTeamStats === 'function') {
          this.teamIcon.updateTeamStats(this.teamStats);
        }
        
        if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
          if (typeof this.teamUI.handlePokemonUpdate === 'function') {
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
      
      if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
        if (typeof this.teamUI.requestTeamData === 'function') {
          this.teamUI.requestTeamData();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamHealed:', error);
    }
  }

  handleTeamActionResult(data) {
    try {
      console.log('⚔️ Résultat action équipe:', data);
      
      if (data.success) {
        this.showNotification(data.message || 'Action réussie', 'success');
        
        if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
          if (typeof this.teamUI.requestTeamData === 'function') {
            this.teamUI.requestTeamData();
          }
        }
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
      
      if (this.teamIcon && typeof this.teamIcon.onBattleStart === 'function') {
        this.teamIcon.onBattleStart();
      }
      
      if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
        if (typeof this.teamUI.hide === 'function') {
          this.teamUI.hide();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleBattleStart:', error);
    }
  }

  handleBattleEnd(data) {
    try {
      console.log('⚔️ Combat terminé:', data);
      
      this.isInBattle = false;
      
      if (this.teamIcon && typeof this.teamIcon.onBattleEnd === 'function') {
        this.teamIcon.onBattleEnd();
      }
      
      if (this.teamUI && this.teamUI.isOpen && this.teamUI.isOpen()) {
        if (typeof this.teamUI.requestTeamData === 'function') {
          this.teamUI.requestTeamData();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleBattleEnd:', error);
    }
  }

  handlePokemonCaught(data) {
    try {
      console.log('⚔️ Pokémon capturé:', data);
      
      if (data.addedToTeam) {
        this.showNotification(`${data.pokemon.name} ajouté à l'équipe!`, 'success');
        
        if (this.teamUI && typeof this.teamUI.onPokemonCaught === 'function') {
          this.teamUI.onPokemonCaught(data.pokemon);
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonCaught:', error);
    }
  }

  // ✅ MÉTHODE MODIFIÉE: Setup raccourcis avec protection
  setupGlobalShortcuts() {
    const keyHandler = (e) => {
      if (e.key.toLowerCase() === 't' && 
          !e.target.matches('input, textarea, [contenteditable]') &&
          this.canInteract()) {
        e.preventDefault();
        this.toggleTeamUI();
      }
    };

    document.addEventListener('keydown', keyHandler);
    this.keyboardHandler = keyHandler;

    window.isTeamOpen = () => this.teamUI?.isOpen() || false;
    window.TeamManager = this;
  }

  // ✅ MÉTHODE AMÉLIORÉE: Arrêt gracieux
  gracefulShutdown() {
    console.log('🛑 TeamManager: Arrêt gracieux amélioré...');
    
    this.isInitialized = false;
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
      this.initializationTimeout = null;
    }

    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }

    if (this.teamUI) {
      try {
        if (typeof this.teamUI.hide === 'function') {
          this.teamUI.hide();
        }
        if (typeof this.teamUI.destroy === 'function') {
          this.teamUI.destroy();
        }
      } catch (error) {
        console.warn('⚠️ Erreur nettoyage TeamUI:', error);
      }
      this.teamUI = null;
    }

    if (this.teamIcon) {
      try {
        if (typeof this.teamIcon.hide === 'function') {
          this.teamIcon.hide();
        }
        if (typeof this.teamIcon.destroy === 'function') {
          this.teamIcon.destroy();
        }
      } catch (error) {
        console.warn('⚠️ Erreur nettoyage TeamIcon:', error);
      }
      this.teamIcon = null;
    }

    this.teamData = [];
    this.listenerKeys = [];
    this.currentRetries = 0;

    console.log('✅ TeamManager: Arrêt gracieux terminé');
  }

  // ✅ MÉTHODE AMÉLIORÉE: Gestion des erreurs d'initialisation
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

  // ✅ MÉTHODES PUBLIQUES AMÉLIORÉES
  toggleTeamUI() {
    if (!this.isInitialized) {
      this.showNotification('Système d\'équipe en cours d\'initialisation...', 'warning');
      return;
    }

    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI && typeof this.teamUI.toggle === 'function') {
      try {
        this.teamUI.toggle();
      } catch (error) {
        console.error('❌ Erreur toggle TeamUI:', error);
        this.showNotification('Erreur lors de l\'ouverture de l\'équipe', 'error');
      }
    } else {
      console.warn('⚠️ TeamManager: TeamUI pas disponible');
      this.showNotification('Interface d\'équipe non disponible', 'warning');
    }
  }

  openTeamUI() {
    if (!this.isInitialized) {
      this.showNotification('Système d\'équipe en cours d\'initialisation...', 'warning');
      return;
    }

    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI && typeof this.teamUI.show === 'function') {
      try {
        this.teamUI.show();
      } catch (error) {
        console.error('❌ Erreur ouverture TeamUI:', error);
        this.showNotification('Erreur lors de l\'ouverture de l\'équipe', 'error');
      }
    } else {
      console.warn('⚠️ TeamManager: TeamUI pas disponible');
      this.showNotification('Interface d\'équipe non disponible', 'warning');
    }
  }

  closeTeamUI() {
    if (this.teamUI && typeof this.teamUI.hide === 'function') {
      try {
        this.teamUI.hide();
      } catch (error) {
        console.error('❌ Erreur fermeture TeamUI:', error);
      }
    }
  }

  healTeam() {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      this.showNotification('Connexion instable, impossible de soigner l\'équipe', 'error');
      return;
    }

    try {
      this.gameRoom.send("healTeam");
      this.showNotification('Demande de soin envoyée...', 'info');
    } catch (error) {
      console.error('❌ TeamManager: Erreur healTeam:', error);
      this.showNotification('Erreur lors du soin de l\'équipe', 'error');
    }
  }

  healPokemon(pokemonId) {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      this.showNotification('Connexion instable, impossible de soigner le Pokémon', 'error');
      return;
    }

    try {
      this.gameRoom.send("healPokemon", { pokemonId });
      this.showNotification('Demande de soin envoyée...', 'info');
    } catch (error) {
      console.error('❌ TeamManager: Erreur healPokemon:', error);
      this.showNotification('Erreur lors du soin du Pokémon', 'error');
    }
  }

  removePokemon(pokemonId) {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      this.showNotification('Connexion instable, impossible de retirer le Pokémon', 'error');
      return;
    }

    try {
      this.gameRoom.send("removeFromTeam", { pokemonId });
    } catch (error) {
      console.error('❌ TeamManager: Erreur removePokemon:', error);
      this.showNotification('Erreur lors du retrait du Pokémon', 'error');
    }
  }

  swapPokemon(fromSlot, toSlot) {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      this.showNotification('Connexion instable, impossible d\'échanger les Pokémon', 'error');
      return;
    }

    try {
      this.gameRoom.send("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
    } catch (error) {
      console.error('❌ TeamManager: Erreur swapPokemon:', error);
      this.showNotification('Erreur lors de l\'échange des Pokémon', 'error');
    }
  }

  autoArrangeTeam() {
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      this.showNotification('Connexion instable, impossible d\'arranger l\'équipe', 'error');
      return;
    }

    try {
      this.gameRoom.send("autoArrangeTeam");
    } catch (error) {
      console.error('❌ TeamManager: Erreur autoArrangeTeam:', error);
      this.showNotification('Erreur lors de l\'arrangement de l\'équipe', 'error');
    }
  }

  requestTeamData() {
    this.requestTeamDataSafely();
  }

  // ✅ MÉTHODES UTILITAIRES AMÉLIORÉES
  calculateStats() {
    try {
      if (!Array.isArray(this.teamData)) {
        console.warn('⚠️ TeamManager: teamData n\'est pas un array');
        this.teamData = [];
      }

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
      
      console.log('⚔️ Stats calculées:', this.teamStats);
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur calculateStats:', error);
      this.teamStats = {
        totalPokemon: 0,
        alivePokemon: 0,
        faintedPokemon: 0,
        averageLevel: 0,
        canBattle: false
      };
    }
  }

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

  canBattle() {
    return this.teamStats.canBattle;
  }

  isTeamFull() {
    return this.teamData.length >= 6;
  }

  showNotification(message, type = 'info') {
    try {
      if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
      } else if (typeof window.showGameNotification === 'function') {
        window.showGameNotification(message, type);
      } else {
        console.log(`📢 TeamManager [${type}]: ${message}`);
      }
    } catch (error) {
      console.error('❌ TeamManager: Erreur notification:', error);
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE: Destroy sécurisé
  destroy() {
    console.log('⚔️ Destruction sécurisée du TeamManager');
    
    this.gracefulShutdown();
    
    if (window.isTeamOpen) {
      delete window.isTeamOpen;
    }
    
    if (window.TeamManager === this) {
      delete window.TeamManager;
    }
    
    if (window.teamManagerGlobal === this) {
      delete window.teamManagerGlobal;
    }
    
    this.teamData = [];
    this.gameRoom = null;
    
    console.log('✅ TeamManager détruit proprement');
  }

  // ✅ GETTERS ET MÉTHODES UTILITAIRES SÉCURISÉES
  getTeamData() {
    return Array.isArray(this.teamData) ? [...this.teamData] : [];
  }

  getTeamStats() {
    return { ...this.teamStats };
  }

  getPokemonBySlot(slot) {
    if (slot >= 0 && slot < this.teamData.length) {
      return this.teamData[slot];
    }
    return null;
  }

  getAlivePokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0);
  }

  getFaintedPokemon() {
    return this.teamData.filter(p => p && p.currentHp === 0);
  }

  // ✅ MÉTHODES D'ÉVÉNEMENTS POUR L'INTÉGRATION
  on(eventName, callback) {
    if (!this.eventCallbacks) {
      this.eventCallbacks = {};
    }
    
    if (!this.eventCallbacks[eventName]) {
      this.eventCallbacks[eventName] = [];
    }
    
    this.eventCallbacks[eventName].push(callback);
  }

  emit(eventName, data) {
    if (this.eventCallbacks && this.eventCallbacks[eventName]) {
      this.eventCallbacks[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ TeamManager: Erreur callback ${eventName}:`, error);
        }
      });
    }
  }

  // ✅ MÉTHODES DE DEBUG
  debugState() {
    console.log('🔍 TeamManager Debug State:', {
      isInitialized: this.isInitialized,
      connectionState: this.connectionState,
      currentRetries: this.currentRetries,
      teamData: this.teamData.length,
      teamStats: this.teamStats,
      hasTeamUI: !!this.teamUI,
      hasTeamIcon: !!this.teamIcon,
      gameRoomConnected: this.gameRoom?.connection?.readyState === 1,
      listenerCount: this.listenerKeys.length
    });
  }

  // ✅ MÉTHODES D'EXPORT/IMPORT POUR LA SAUVEGARDE
  exportData() {
    return {
      teamData: this.teamData,
      teamStats: this.teamStats,
      isInBattle: this.isInBattle
    };
  }

  importData(data) {
    if (data.teamData && Array.isArray(data.teamData)) {
      this.teamData = data.teamData;
    }
    
    if (data.teamStats && typeof data.teamStats === 'object') {
      this.teamStats = { ...this.teamStats, ...data.teamStats };
    }
    
    if (typeof data.isInBattle === 'boolean') {
      this.isInBattle = data.isInBattle;
    }
    
    this.calculateStats();
    
    if (this.teamIcon && typeof this.teamIcon.updateTeamStats === 'function') {
      this.teamIcon.updateTeamStats(this.teamStats);
    }
  }

  // ✅ MÉTHODES DE GESTION DES ÉVÉNEMENTS BATTLE
  onBattleStartRequested() {
    if (!this.canBattle()) {
      this.showNotification('Aucun Pokémon en état de combattre!', 'error');
      return false;
    }
    
    return true;
  }

  onBattleStart() {
    this.handleBattleStart({});
  }

  onBattleEnd() {
    this.handleBattleEnd({});
  }

  // ✅ MÉTHODES DE TEST ET DEBUG
  testConnection() {
    try {
      if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
        console.log('❌ TeamManager: Connexion non disponible');
        return false;
      }
      
      this.gameRoom.send("ping");
      console.log('✅ TeamManager: Test connexion envoyé');
      return true;
    } catch (error) {
      console.error('❌ TeamManager: Erreur test connexion:', error);
      return false;
    }
  }

  forceRefresh() {
    console.log('🔄 TeamManager: Force refresh...');
    
    if (this.teamUI && typeof this.teamUI.requestTeamData === 'function') {
      this.teamUI.requestTeamData();
    }
    
    this.requestTeamDataSafely();
  }

  // ✅ MÉTHODES DE RÉCUPÉRATION D'ERREURS
  attemptRecovery() {
    console.log('🔄 TeamManager: Tentative de récupération...');
    
    if (!this.gameRoom || this.gameRoom.connection.readyState !== 1) {
      console.log('❌ TeamManager: Impossible de récupérer sans connexion');
      return false;
    }
    
    try {
      // Réinitialiser les listeners
      this.cleanupListeners();
      setTimeout(() => {
        this.setupStabilizedServerListeners();
      }, 1000);
      
      // Redemander les données
      setTimeout(() => {
        this.requestTeamDataSafely();
      }, 2000);
      
      console.log('✅ TeamManager: Récupération initiée');
      return true;
    } catch (error) {
      console.error('❌ TeamManager: Erreur récupération:', error);
      return false;
    }
  }
}

// ✅ FONCTION D'INITIALISATION SÉCURISÉE
export function initializeTeamSystem(gameRoom) {
  if (window.TeamManager && window.TeamManager.isInitialized) {
    console.warn('⚠️ TeamManager déjà initialisé');
    return window.TeamManager;
  }
  
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
    window.teamManagerGlobal = teamManager;
    
    console.log('✅ Système d\'équipe initialisé avec protection');
    return teamManager;
  } catch (error) {
    console.error('❌ Erreur initialisation TeamManager:', error);
    return null;
  }
}

export default TeamManager;
