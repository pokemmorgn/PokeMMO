// client/src/managers/TeamManager.js - VERSION CORRIGÉE COMPLÈTE
// ✅ Correction problèmes de timing et disparition après transition

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
    this.isDestroyed = false;
    
    // ✅ NOUVEAU: Protection contre les initialisations multiples
    this.initializationPromise = null;
    this.iconRetryCount = 0;
    this.maxIconRetries = 5;
    
    // Callbacks simples
    this.callbacks = {
      onPokemonAdded: null,
      onPokemonRemoved: null,
      onTeamHealed: null,
      onBattleStart: null,
      onBattleEnd: null
    };
    
    console.log('⚔️ TeamManager: Instance créée');
  }

  // ✅ NOUVELLE MÉTHODE: Initialisation avec protection contre double init
  async init() {
    if (this.isDestroyed) {
      console.warn('⚠️ TeamManager: Tentative d\'init sur instance détruite');
      return false;
    }

    if (this.initializationPromise) {
      console.log('⏳ TeamManager: Initialisation déjà en cours, attente...');
      return await this.initializationPromise;
    }

    if (this.isInitialized) {
      console.log('ℹ️ TeamManager: Déjà initialisé');
      return true;
    }

    console.log('⚔️ TeamManager: === INITIALISATION SÉCURISÉE ===');

    this.initializationPromise = this.performInitialization();
    
    try {
      const success = await this.initializationPromise;
      this.initializationPromise = null;
      return success;
    } catch (error) {
      console.error('❌ TeamManager: Erreur initialisation:', error);
      this.initializationPromise = null;
      return false;
    }
  }

  // ✅ MÉTHODE PRIVÉE: Vraie initialisation
  async performInitialization() {
    try {
      console.log('🔧 TeamManager: Début initialisation...');
      
      // 1. Vérifier la connexion
      if (!this.gameRoom) {
        throw new Error('Pas de gameRoom fournie');
      }

      // 2. Créer les composants UI avec retry automatique
      await this.createUIComponentsWithRetry();
      
      // 3. Setup des listeners serveur
      this.setupServerListeners();
      
      // 4. Setup des raccourcis globaux
      this.setupGlobalShortcuts();
      
      // 5. Setup des handlers de connexion
      this.setupBasicConnectionHandling();
      
      this.isInitialized = true;
      console.log('✅ TeamManager: Initialisé avec succès');
      
      // 6. Demander les données initiales avec délai
      setTimeout(() => {
        if (!this.isDestroyed && this.isInitialized) {
          this.requestTeamData();
        }
      }, 1000);
      
      // 7. Notifier l'initialisation
      if (typeof window.onSystemInitialized === 'function') {
        window.onSystemInitialized('team');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur performInitialization:', error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Création UI avec retry automatique
  async createUIComponentsWithRetry() {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries && !this.isDestroyed) {
      try {
        attempt++;
        console.log(`🔧 TeamManager: Tentative création UI ${attempt}/${maxRetries}`);
        
        // Créer TeamUI
        if (!this.teamUI) {
          this.teamUI = new TeamUI(this.gameRoom);
          console.log('✅ TeamUI créé');
        }
        
        // Créer TeamIcon avec vérification
        if (!this.teamIcon) {
          this.teamIcon = new TeamIcon(this.teamUI);
          console.log('✅ TeamIcon créé');
          
          // ✅ VÉRIFIER QUE L'ICÔNE EST VRAIMENT DANS LE DOM
          await this.waitForIconInDOM();
        }
        
        // ✅ AFFICHER L'ICÔNE avec délai progressif
        const showDelay = attempt * 500; // 500ms, 1s, 1.5s
        setTimeout(() => {
          if (this.teamIcon && !this.isDestroyed) {
            console.log(`🎯 TeamManager: Affichage icône (tentative ${attempt})`);
            this.teamIcon.show();
            
            // ✅ Vérifier l'affichage après 200ms
            setTimeout(() => {
              this.verifyIconVisibility();
            }, 200);
          }
        }, showDelay);
        
        console.log('✅ TeamManager: Composants UI créés avec succès');
        return; // Succès, sortir de la boucle
        
      } catch (error) {
        console.error(`❌ TeamManager: Erreur création UI (tentative ${attempt}):`, error);
        
        // Nettoyer avant de retry
        if (this.teamUI) {
          try { this.teamUI.destroy?.(); } catch (e) {}
          this.teamUI = null;
        }
        if (this.teamIcon) {
          try { this.teamIcon.destroy?.(); } catch (e) {}
          this.teamIcon = null;
        }
        
        if (attempt >= maxRetries) {
          throw new Error(`Échec création UI après ${maxRetries} tentatives`);
        }
        
        // Attendre avant retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Attendre que l'icône soit dans le DOM
  async waitForIconInDOM(timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const iconElement = document.querySelector('#team-icon');
      if (iconElement) {
        console.log('✅ TeamManager: Icône trouvée dans le DOM');
        return true;
      }
      
      // Attendre 100ms avant vérifier à nouveau
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ TeamManager: Timeout attente icône dans DOM');
    return false;
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier visibilité de l'icône
  verifyIconVisibility() {
    const iconElement = document.querySelector('#team-icon');
    if (!iconElement) {
      console.error('❌ TeamManager: Icône team manquante dans le DOM !');
      this.handleMissingIcon();
      return false;
    }
    
    const isVisible = iconElement.style.display !== 'none' && 
                     !iconElement.classList.contains('hidden') &&
                     iconElement.offsetParent !== null;
    
    if (!isVisible) {
      console.warn('⚠️ TeamManager: Icône team présente mais invisible');
      this.handleInvisibleIcon(iconElement);
      return false;
    }
    
    console.log('✅ TeamManager: Icône team visible et OK');
    return true;
  }

  // ✅ NOUVELLE MÉTHODE: Gérer icône manquante
  handleMissingIcon() {
    if (this.iconRetryCount >= this.maxIconRetries) {
      console.error('❌ TeamManager: Trop de tentatives de récupération d\'icône');
      return;
    }
    
    this.iconRetryCount++;
    console.log(`🔄 TeamManager: Tentative récupération icône ${this.iconRetryCount}/${this.maxIconRetries}`);
    
    // Tenter de recréer l'icône
    setTimeout(() => {
      if (!this.isDestroyed && this.teamUI) {
        try {
          // Nettoyer l'ancienne icône
          if (this.teamIcon) {
            this.teamIcon.destroy?.();
          }
          
          // Créer une nouvelle icône
          this.teamIcon = new TeamIcon(this.teamUI);
          
          setTimeout(() => {
            if (this.teamIcon) {
              this.teamIcon.show();
            }
          }, 300);
          
        } catch (error) {
          console.error('❌ TeamManager: Erreur recréation icône:', error);
        }
      }
    }, 1000 * this.iconRetryCount); // Délai progressif
  }

  // ✅ NOUVELLE MÉTHODE: Gérer icône invisible
  handleInvisibleIcon(iconElement) {
    console.log('🔧 TeamManager: Correction visibilité icône...');
    
    // Forcer la visibilité
    iconElement.style.display = '';
    iconElement.classList.remove('hidden');
    
    // Réappliquer les styles si nécessaire
    if (this.teamIcon && this.teamIcon.show) {
      this.teamIcon.show();
    }
  }

  // ✅ MÉTHODE INCHANGÉE: Setup des listeners serveur
  setupServerListeners() {
    if (!this.gameRoom) {
      console.error('❌ TeamManager: Pas de gameRoom pour les listeners');
      return;
    }

    console.log('🔧 TeamManager: Configuration listeners...');

    try {
      this.gameRoom.onMessage("teamData", (data) => {
        this.handleTeamData(data);
      });

      this.gameRoom.onMessage("teamStats", (data) => {
        this.handleTeamStats(data);
      });

      this.gameRoom.onMessage("pokemonAddedToTeam", (data) => {
        this.handlePokemonAdded(data);
      });

      this.gameRoom.onMessage("pokemonRemovedFromTeam", (data) => {
        this.handlePokemonRemoved(data);
      });

      this.gameRoom.onMessage("pokemonUpdated", (data) => {
        this.handlePokemonUpdate(data);
      });

      this.gameRoom.onMessage("teamHealed", (data) => {
        this.handleTeamHealed(data);
      });

      this.gameRoom.onMessage("teamActionResult", (data) => {
        this.handleTeamActionResult(data);
      });

      this.gameRoom.onMessage("battleStart", (data) => {
        this.handleBattleStart(data);
      });

      this.gameRoom.onMessage("battleEnd", (data) => {
        this.handleBattleEnd(data);
      });

      this.gameRoom.onMessage("pokemonCaught", (data) => {
        this.handlePokemonCaught(data);
      });

      console.log('✅ TeamManager: Listeners configurés');

    } catch (error) {
      console.error('❌ TeamManager: Erreur setup listeners:', error);
    }
  }

  // ✅ MÉTHODES INCHANGÉES: Handlers simples
  setupBasicConnectionHandling() {
    if (!this.gameRoom) return;
    console.log('✅ TeamManager: Gestion connexion basique configurée');
  }

  safeSend(messageType, data = {}) {
    if (this.isDestroyed) return false;
    
    if (this.gameRoom && this.gameRoom.connection && this.gameRoom.connection.readyState === 1) {
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

  requestTeamData() {
    if (this.isDestroyed) return;
    
    console.log('📡 TeamManager: Demande données équipe...');
    this.safeSend("getTeam");
  }

  // ✅ HANDLERS INCHANGÉS
  handleTeamData(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Données d\'équipe reçues:', data);
      
      this.teamData = Array.isArray(data.team) ? data.team : [];
      this.calculateStats();
      
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
    if (this.isDestroyed) return;
    
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
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Pokémon ajouté:', data);
      
      if (data.pokemon) {
        this.teamData.push(data.pokemon);
        this.calculateStats();
        
        if (this.callbacks.onPokemonAdded) {
          this.callbacks.onPokemonAdded(data.pokemon);
        }
        
        if (this.teamIcon && this.teamIcon.onPokemonAdded) {
          this.teamIcon.onPokemonAdded(data.pokemon);
        }
        
        const name = data.pokemon.nickname || data.pokemon.name;
        this.showNotification(`${name} ajouté à l'équipe!`, 'success');
        
        if (this.teamUI && this.teamUI.isOpen()) {
          this.requestTeamData();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonAdded:', error);
    }
  }

  handlePokemonRemoved(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Pokémon retiré:', data);
      
      if (data.pokemonId) {
        this.teamData = this.teamData.filter(p => p._id !== data.pokemonId);
        this.calculateStats();
        
        if (this.callbacks.onPokemonRemoved) {
          this.callbacks.onPokemonRemoved(data);
        }
        
        if (this.teamIcon && this.teamIcon.onPokemonRemoved) {
          this.teamIcon.onPokemonRemoved();
        }
        
        this.showNotification('Pokémon retiré de l\'équipe', 'info');
        
        if (this.teamUI && this.teamUI.isOpen()) {
          this.requestTeamData();
        }
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handlePokemonRemoved:', error);
    }
  }

  handlePokemonUpdate(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Pokémon mis à jour:', data);
      
      if (data.pokemonId) {
        const pokemonIndex = this.teamData.findIndex(p => p._id === data.pokemonId);
        if (pokemonIndex !== -1) {
          this.teamData[pokemonIndex] = { ...this.teamData[pokemonIndex], ...data.updates };
          this.calculateStats();
          
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
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Équipe soignée:', data);
      
      if (this.callbacks.onTeamHealed) {
        this.callbacks.onTeamHealed(data);
      }
      
      this.showNotification('Équipe soignée avec succès!', 'success');
      this.requestTeamData();
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamHealed:', error);
    }
  }

  handleTeamActionResult(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Résultat action équipe:', data);
      
      if (data.success) {
        this.showNotification(data.message || 'Action réussie', 'success');
        this.requestTeamData();
      } else {
        this.showNotification(data.message || 'Action échouée', 'error');
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleTeamActionResult:', error);
    }
  }

  handleBattleStart(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Combat démarré:', data);
      
      this.isInBattle = true;
      
      if (this.callbacks.onBattleStart) {
        this.callbacks.onBattleStart(data);
      }
      
      if (this.teamIcon && this.teamIcon.onBattleStart) {
        this.teamIcon.onBattleStart();
      }
      
      if (this.teamUI && this.teamUI.isOpen()) {
        this.teamUI.hide();
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleBattleStart:', error);
    }
  }

  handleBattleEnd(data) {
    if (this.isDestroyed) return;
    
    try {
      console.log('⚔️ Combat terminé:', data);
      
      this.isInBattle = false;
      
      if (this.callbacks.onBattleEnd) {
        this.callbacks.onBattleEnd(data);
      }
      
      if (this.teamIcon && this.teamIcon.onBattleEnd) {
        this.teamIcon.onBattleEnd();
      }
      
      this.requestTeamData();
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur handleBattleEnd:', error);
    }
  }

  handlePokemonCaught(data) {
    if (this.isDestroyed) return;
    
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

  // ✅ MÉTHODES PUBLIQUES AVEC PROTECTION
  toggleTeamUI() {
    if (this.isDestroyed || !this.isInitialized) {
      console.warn('⚠️ TeamManager: Système non prêt pour toggle');
      return;
    }

    if (!this.canInteract()) {
      this.showNotification('Impossible d\'ouvrir l\'équipe maintenant', 'warning');
      return;
    }
    
    if (this.teamUI) {
      this.teamUI.toggle();
    } else {
      console.warn('⚠️ TeamManager: TeamUI non disponible');
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

  // ✅ ACTIONS DE BASE INCHANGÉES
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

  // ✅ CALLBACKS INCHANGÉS
  onPokemonAdded(callback) {
    this.callbacks.onPokemonAdded = callback;
  }

  onPokemonRemoved(callback) {
    this.callbacks.onPokemonRemoved = callback;
  }

  onTeamHealed(callback) {
    this.callbacks.onTeamHealed = callback;
  }

  onBattleStart(callback) {
    this.callbacks.onBattleStart = callback;
  }

  onBattleEnd(callback) {
    this.callbacks.onBattleEnd = callback;
  }

  // ✅ MÉTHODES UTILITAIRES INCHANGÉES
  calculateStats() {
    if (this.isDestroyed) return;
    
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

  canInteract() {
    if (!this.isInitialized || this.isDestroyed) return false;
    
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

  // ✅ GETTERS INCHANGÉS
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

  // ✅ DEBUG AMÉLIORÉ
  debugState() {
    console.log('🔍 TeamManager Debug:', {
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      teamCount: this.teamData.length,
      teamStats: this.teamStats,
      hasTeamUI: !!this.teamUI,
      hasTeamIcon: !!this.teamIcon,
      iconInDOM: !!document.querySelector('#team-icon'),
      iconVisible: this.verifyIconVisibility(),
      canInteract: this.canInteract(),
      isInBattle: this.isInBattle,
      iconRetryCount: this.iconRetryCount
    });
  }

  // ✅ NOUVELLE MÉTHODE: Vérification santé
  healthCheck() {
    const health = {
      healthy: true,
      issues: []
    };

    if (this.isDestroyed) {
      health.healthy = false;
      health.issues.push('Instance détruite');
    }

    if (!this.isInitialized) {
      health.healthy = false;
      health.issues.push('Non initialisé');
    }

    if (!this.gameRoom) {
      health.healthy = false;
      health.issues.push('Pas de gameRoom');
    }

    if (!this.teamUI) {
      health.healthy = false;
      health.issues.push('TeamUI manquant');
    }

    if (!this.teamIcon) {
      health.healthy = false;
      health.issues.push('TeamIcon manquant');
    }

    const iconInDOM = !!document.querySelector('#team-icon');
    if (!iconInDOM) {
      health.healthy = false;
      health.issues.push('Icône pas dans le DOM');
    }

    return health;
  }

  // ✅ NOUVELLE MÉTHODE: Forcer réparation
  async forceRepair() {
    console.log('🔧 TeamManager: === RÉPARATION FORCÉE ===');
    
    if (this.isDestroyed) {
      console.error('❌ Cannot repair destroyed instance');
      return false;
    }

    try {
      // 1. Vérifier et réparer l'icône
      if (!document.querySelector('#team-icon')) {
        console.log('🔧 Réparation: Recréation icône...');
        await this.recreateIcon();
      }

      // 2. Vérifier la visibilité
      if (!this.verifyIconVisibility()) {
        console.log('🔧 Réparation: Correction visibilité...');
        this.forceIconVisibility();
      }

      // 3. Re-demander les données
      console.log('🔧 Réparation: Resync données...');
      this.requestTeamData();

      // 4. Reset les compteurs d'erreur
      this.iconRetryCount = 0;

      console.log('✅ TeamManager: Réparation terminée');
      return true;

    } catch (error) {
      console.error('❌ TeamManager: Erreur réparation:', error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recréer icône
  async recreateIcon() {
    try {
      console.log('🔧 TeamManager: Recréation icône...');
      
      // Nettoyer l'ancienne icône
      if (this.teamIcon) {
        try {
          this.teamIcon.destroy?.();
        } catch (e) {
          console.warn('⚠️ Erreur destruction ancienne icône:', e);
        }
        this.teamIcon = null;
      }

      // Supprimer du DOM si présent
      const oldIcon = document.querySelector('#team-icon');
      if (oldIcon) {
        oldIcon.remove();
      }

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 200));

      // Recréer
      if (this.teamUI) {
        this.teamIcon = new TeamIcon(this.teamUI);
        
        // Attendre que ce soit dans le DOM
        await this.waitForIconInDOM();
        
        // Afficher
        setTimeout(() => {
          if (this.teamIcon && !this.isDestroyed) {
            this.teamIcon.show();
          }
        }, 300);
        
        console.log('✅ TeamManager: Icône recréée');
        return true;
      }
      
    } catch (error) {
      console.error('❌ TeamManager: Erreur recréation icône:', error);
      return false;
    }
  }

  // ✅ NOUVELLE MÉTHODE: Forcer visibilité icône
  forceIconVisibility() {
    const iconElement = document.querySelector('#team-icon');
    if (iconElement) {
      console.log('🔧 TeamManager: Force visibilité icône...');
      
      // Supprimer tous les styles qui pourraient cacher
      iconElement.style.display = '';
      iconElement.style.visibility = '';
      iconElement.style.opacity = '';
      iconElement.classList.remove('hidden');
      
      // Réappliquer la méthode show si disponible
      if (this.teamIcon && this.teamIcon.show) {
        this.teamIcon.show();
      }
      
      console.log('✅ TeamManager: Visibilité forcée');
    }
  }

  // ✅ DESTROY AMÉLIORÉ avec protection
  destroy() {
    if (this.isDestroyed) {
      console.log('ℹ️ TeamManager: Déjà détruit');
      return;
    }

    console.log('⚔️ TeamManager: === DESTRUCTION SÉCURISÉE ===');
    
    this.isDestroyed = true;
    this.isInitialized = false;
    
    // Annuler l'initialisation en cours si présente
    if (this.initializationPromise) {
      this.initializationPromise = null;
    }

    // Nettoyer les composants UI
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
    
    // Nettoyer le DOM
    try {
      const iconElement = document.querySelector('#team-icon');
      if (iconElement) {
        iconElement.remove();
      }
    } catch (error) {
      console.warn('⚠️ Erreur suppression DOM:', error);
    }
    
    // Nettoyer les callbacks
    this.callbacks = {
      onPokemonAdded: null,
      onPokemonRemoved: null,
      onTeamHealed: null,
      onBattleStart: null,
      onBattleEnd: null
    };
    
    // Nettoyer les références globales
    try {
      if (window.isTeamOpen) {
        delete window.isTeamOpen;
      }
      
      if (window.TeamManager === this) {
        window.TeamManager = null;
      }
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage globals:', error);
    }
    
    // Nettoyer les données
    this.teamData = [];
    this.gameRoom = null;
    this.iconRetryCount = 0;
    
    console.log('✅ TeamManager: Destruction terminée');
  }

  // ✅ NOUVELLE MÉTHODE: Vérification périodique
  startHealthMonitoring() {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
    }

    this.healthMonitorInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(this.healthMonitorInterval);
        return;
      }

      const health = this.healthCheck();
      if (!health.healthy) {
        console.warn('⚠️ TeamManager: Problèmes détectés:', health.issues);
        
        // Tentative de réparation automatique pour certains problèmes
        if (health.issues.includes('Icône pas dans le DOM') && this.iconRetryCount < this.maxIconRetries) {
          console.log('🔧 TeamManager: Réparation automatique icône...');
          this.handleMissingIcon();
        }
      }
    }, 10000); // Vérification toutes les 10 secondes
  }

  stopHealthMonitoring() {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
    }
  }
}

// ✅ FONCTION D'INITIALISATION AMÉLIORÉE
export async function initializeTeamSystem(gameRoom) {
  console.log('🔧 === INITIALISATION TEAM SYSTEM SÉCURISÉE ===');
  
  // Vérifier si déjà initialisé
  if (window.TeamManager && window.TeamManager.isInitialized && !window.TeamManager.isDestroyed) {
    console.log('ℹ️ TeamManager déjà initialisé et fonctionnel');
    
    // Vérifier la santé
    const health = window.TeamManager.healthCheck();
    if (health.healthy) {
      return window.TeamManager;
    } else {
      console.log('⚠️ TeamManager existe mais problématique, tentative réparation...');
      const repaired = await window.TeamManager.forceRepair();
      if (repaired) {
        return window.TeamManager;
      }
    }
  }
  
  // Nettoyer l'ancien s'il existe
  if (window.TeamManager) {
    console.log('🧹 Nettoyage ancien TeamManager...');
    try {
      window.TeamManager.destroy();
    } catch (error) {
      console.warn('⚠️ Erreur destruction ancien TeamManager:', error);
    }
    window.TeamManager = null;
  }
  
  if (!gameRoom) {
    console.error('❌ initializeTeamSystem: Pas de gameRoom fournie');
    return null;
  }

  try {
    console.log('🚀 Création nouveau TeamManager...');
    
    const teamManager = new TeamManager(gameRoom);
    
    // Initialiser de manière asynchrone
    const success = await teamManager.init();
    
    if (success) {
      // Enregistrer globalement
      window.TeamManager = teamManager;
      window.teamManagerGlobal = teamManager;
      
      // Démarrer la surveillance de santé
      teamManager.startHealthMonitoring();
      
      console.log('✅ TeamManager initialisé avec succès');
      return teamManager;
    } else {
      console.error('❌ Échec initialisation TeamManager');
      teamManager.destroy();
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erreur initializeTeamSystem:', error);
    return null;
  }
}

// ✅ FONCTION DE RÉPARATION GLOBALE
window.repairTeamSystem = async function() {
  console.log('🔧 === RÉPARATION GLOBALE TEAM SYSTEM ===');
  
  if (window.TeamManager && !window.TeamManager.isDestroyed) {
    const success = await window.TeamManager.forceRepair();
    if (success) {
      console.log('✅ Réparation réussie');
      return true;
    }
  }
  
  // Si réparation échoue, réinitialiser complètement
  console.log('🔄 Réinitialisation complète...');
  
  const gameRoom = window.globalNetworkManager?.room;
  if (gameRoom) {
    const newTeamManager = await initializeTeamSystem(gameRoom);
    return !!newTeamManager;
  }
  
  console.error('❌ Impossible de réparer: pas de gameRoom');
  return false;
};

// ✅ FONCTIONS DE DEBUG GLOBALES AMÉLIORÉES
window.debugTeamSystemComplete = function() {
  console.log('🔍 === DEBUG TEAM SYSTEM COMPLET ===');
  
  const status = {
    // Manager global
    hasGlobalManager: !!window.TeamManager,
    managerInitialized: window.TeamManager?.isInitialized || false,
    managerDestroyed: window.TeamManager?.isDestroyed || false,
    
    // UI Elements
    teamIconInDOM: !!document.querySelector('#team-icon'),
    teamIconVisible: false,
    teamOverlayInDOM: !!document.querySelector('#team-overlay'),
    
    // Health check
    healthCheck: null,
    
    // Network
    hasGameRoom: !!window.globalNetworkManager?.room,
    networkConnected: window.globalNetworkManager?.isConnected || false
  };
  
  // Vérifier visibilité icône
  if (status.teamIconInDOM) {
    const icon = document.querySelector('#team-icon');
    status.teamIconVisible = icon.offsetParent !== null && 
                            icon.style.display !== 'none' &&
                            !icon.classList.contains('hidden');
  }
  
  // Health check si manager existe
  if (window.TeamManager && !window.TeamManager.isDestroyed) {
    status.healthCheck = window.TeamManager.healthCheck();
  }
  
  console.log('📊 Status:', status);
  
  // Recommandations
  if (!status.hasGlobalManager) {
    console.log('💡 Recommandation: Exécuter window.initTeamSystem()');
  } else if (!status.managerInitialized) {
    console.log('💡 Recommandation: Manager pas initialisé');
  } else if (status.healthCheck && !status.healthCheck.healthy) {
    console.log('💡 Recommandation: Exécuter window.repairTeamSystem()');
    console.log('❌ Problèmes:', status.healthCheck.issues);
  } else if (!status.teamIconVisible) {
    console.log('💡 Recommandation: Icône invisible, vérifier CSS');
  } else {
    console.log('✅ Système Team semble fonctionnel');
  }
  
  return status;
};

// ✅ TEST RAPIDE
window.testTeamSystemQuick = function() {
  console.log('🧪 === TEST RAPIDE TEAM SYSTEM ===');
  
  if (!window.TeamManager) {
    console.log('❌ Pas de TeamManager');
    return false;
  }
  
  if (window.TeamManager.isDestroyed) {
    console.log('❌ TeamManager détruit');
    return false;
  }
  
  if (!window.TeamManager.isInitialized) {
    console.log('❌ TeamManager pas initialisé');
    return false;
  }
  
  const iconExists = !!document.querySelector('#team-icon');
  console.log(`🎯 Icône dans DOM: ${iconExists}`);
  
  if (iconExists) {
    try {
      window.TeamManager.toggleTeamUI();
      console.log('✅ Toggle test réussi');
      
      setTimeout(() => {
        window.TeamManager.toggleTeamUI();
        console.log('✅ Test complet réussi');
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur test:', error);
      return false;
    }
  }
  
  return false;
};

export default TeamManager;
