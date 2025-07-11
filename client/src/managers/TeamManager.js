// client/src/managers/TeamManager.js - VERSION REFACTORISÉE ET OPTIMISÉE
// 🚀 Performance optimisée, intégration UIManager parfaite, design amélioré

import { TeamUI } from '../components/TeamUI.js';
import { TeamIcon } from '../components/TeamIcon.js';

export class TeamManager {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    
    // === MODULES UI ===
    this.teamUI = null;
    this.teamIcon = null;
    
    // === ÉTAT ET DONNÉES ===
    this.isInitialized = false;
    this.teamData = [];
    this.teamStats = {
      totalPokemon: 0,
      alivePokemon: 0,
      faintedPokemon: 0,
      averageLevel: 0,
      canBattle: false
    };
    
    // === PERFORMANCE OPTIMISATIONS ===
    this.updateQueue = new Set();
    this.isUpdating = false;
    this.lastUpdate = 0;
    this.updateThrottle = 100; // 100ms throttle
    this.rafId = null;
    
    // === CACHE ET MÉMOIRE ===
    this.cache = {
      lastTeamData: null,
      lastStatsHash: null,
      renderedElements: new Map()
    };
    
    // === EVENT MANAGEMENT ===
    this.eventListeners = new Map();
    this.abortController = new AbortController();
    
    // === UI MANAGER INTEGRATION ===
    this.uiManagerState = {
      visible: true,
      enabled: true,
      initialized: false,
      moduleId: 'teamManager',
      priority: 100
    };
    
    // === CONFIGURATION ===
    this.config = {
      enableDebugLogs: false,
      autoSave: true,
      saveInterval: 30000, // 30 secondes
      maxRetries: 3,
      enableAnimations: true,
      batchUpdates: true
    };
    
    console.log("⚔️ [TeamManager] Instance créée (optimisée)");
    this.init();
  }

  // ===== 🚀 INITIALISATION OPTIMISÉE =====
  
  async init() {
    try {
      this.log("🚀 Initialisation TeamManager optimisé...");
      
      // Créer les composants UI de manière optimisée
      await this.createUIComponents();
      
      // Setup des intégrations système
      await this.setupSystemIntegrations();
      
      // Configuration des optimisations
      this.setupPerformanceOptimizations();
      
      // Setup des event listeners avec cleanup automatique
      this.setupEventListeners();
      
      // Setup auto-save
      if (this.config.autoSave) {
        this.setupAutoSave();
      }
      
      // Marquer comme initialisé
      this.isInitialized = true;
      this.uiManagerState.initialized = true;
      
      this.log("✅ TeamManager initialisé avec succès");
      
      // Notifier l'initialisation
      this.emit('initialized', { teamManager: this });
      
    } catch (error) {
      console.error("❌ [TeamManager] Erreur d'initialisation:", error);
      this.handleError(error, 'initialization');
    }
  }

  async createUIComponents() {
    this.log("🎨 Création composants UI...");
    
    try {
      // Créer TeamUI avec configuration optimisée
      this.teamUI = new TeamUI(this.gameRoom, {
        enableCache: true,
        enableAnimations: this.config.enableAnimations,
        batchUpdates: this.config.batchUpdates,
        parent: this
      });
      
      // Attendre que TeamUI soit prêt
      await this.waitForUIReady(this.teamUI);
      
      // Créer TeamIcon avec référence TeamUI
      this.teamIcon = new TeamIcon(this.teamUI, {
        enableNotifications: true,
        autoPosition: true,
        parent: this
      });
      
      // Attendre que TeamIcon soit prêt
      await this.waitForUIReady(this.teamIcon);
      
      // Connecter les composants
      this.connectUIComponents();
      
      this.log("✅ Composants UI créés");
      
    } catch (error) {
      this.handleError(error, 'ui_creation');
      throw error;
    }
  }

  async waitForUIReady(component, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (component && (component.iconElement || component.overlay)) {
          resolve(component);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Component ${component.constructor.name} timeout`));
        } else {
          setTimeout(checkReady, 50);
        }
      };
      
      checkReady();
    });
  }

  connectUIComponents() {
    this.log("🔗 Connexion composants UI...");
    
    if (this.teamUI && this.teamIcon) {
      // Connecter les événements bidirectionnels
      this.teamUI.teamIcon = this.teamIcon;
      this.teamIcon.teamUI = this.teamUI;
      
      // Setup callbacks optimisés
      this.teamUI.onDataUpdate = (data) => this.scheduleUpdate('stats', data);
      this.teamIcon.onClick = () => this.handleIconClick();
      
      // Setup notifications cross-component
      this.teamUI.onNotification = (msg, type) => this.showNotification(msg, type);
      this.teamIcon.onNotification = (msg, type) => this.showNotification(msg, type);
    }
  }

  // ===== 🎯 INTÉGRATIONS SYSTÈME OPTIMISÉES =====

  async setupSystemIntegrations() {
    this.log("🔧 Configuration intégrations système...");
    
    // Setup serveur listeners avec gestion d'erreur
    this.setupServerListeners();
    
    // Setup raccourcis clavier optimisés
    this.setupKeyboardShortcuts();
    
    // Intégration avec autres systèmes
    this.setupExternalIntegrations();
    
    // Setup responsive design
    this.setupResponsiveHandling();
  }

  setupServerListeners() {
    if (!this.gameRoom) {
      this.warn("⚠️ Pas de gameRoom pour les listeners");
      return;
    }

    const signal = this.abortController.signal;

    try {
      // === LISTENERS OPTIMISÉS AVEC THROTTLING ===
      
      // Données d'équipe complètes - throttlé
      this.gameRoom.onMessage("teamData", this.throttle((data) => {
        this.handleTeamDataUpdate(data);
      }, this.updateThrottle));

      // Actions d'équipe - immédiat
      this.gameRoom.onMessage("teamActionResult", (data) => {
        this.handleTeamActionResult(data);
      });

      // Pokémon soigné - immédiat
      this.gameRoom.onMessage("teamHealed", (data) => {
        this.handleTeamHealed(data);
      });

      // Stats d'équipe - throttlé et déduplication
      this.gameRoom.onMessage("teamStats", this.throttle((data) => {
        this.handleTeamStats(data);
      }, this.updateThrottle));

      // Événements Pokémon individuels - batchés
      this.gameRoom.onMessage("pokemonAdded", (data) => {
        this.scheduleUpdate('pokemonAdded', data);
      });

      this.gameRoom.onMessage("pokemonRemoved", (data) => {
        this.scheduleUpdate('pokemonRemoved', data);
      });

      this.gameRoom.onMessage("pokemonUpdated", (data) => {
        this.scheduleUpdate('pokemonUpdated', data);
      });
      
      this.log("✅ Listeners serveur configurés (optimisés)");
      
    } catch (error) {
      this.handleError(error, 'server_listeners');
    }
  }

  setupKeyboardShortcuts() {
    const keyHandler = (e) => {
      // Vérifier si on peut interagir
      if (!this.canPlayerInteract()) return;
      
      switch (e.key.toLowerCase()) {
        case 't':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            this.toggleTeam();
          }
          break;
        case 'escape':
          if (this.teamUI?.isVisible) {
            e.preventDefault();
            this.closeTeam();
          }
          break;
      }
    };

    document.addEventListener('keydown', keyHandler, { 
      signal: this.abortController.signal,
      passive: false 
    });
    
    this.eventListeners.set('keydown', keyHandler);
  }

  setupExternalIntegrations() {
    // Intégration avec le système de quêtes
    if (window.questSystem) {
      this.questSystemIntegration();
    }

    // Intégration avec le chat
    this.chatIntegration();
    
    // Intégration UIManager
    this.uiManagerIntegration();
  }

  questSystemIntegration() {
    try {
      const questSystem = window.questSystem || window.questSystemGlobal;
      
      if (questSystem) {
        // Écouter les captures pour les quêtes
        this.on('pokemonCaught', (data) => {
          if (data.addedToTeam && questSystem.triggerCatchEvent) {
            questSystem.triggerCatchEvent(data.pokemon);
          }
        });
        
        this.log("✅ Intégration système de quêtes");
      }
    } catch (error) {
      this.warn("⚠️ Erreur intégration quêtes:", error);
    }
  }

  chatIntegration() {
    try {
      // Désactiver l'équipe quand le chat est actif
      if (typeof window.isChatFocused === 'function') {
        const checkChatFocus = this.throttle(() => {
          const chatFocused = window.isChatFocused();
          if (this.teamIcon) {
            this.teamIcon.setEnabled(!chatFocused);
          }
        }, 1000);
        
        // Check périodique optimisé
        const intervalId = setInterval(checkChatFocus, 2000);
        
        // Cleanup automatique
        this.abortController.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
        });
      }
    } catch (error) {
      this.warn("⚠️ Erreur intégration chat:", error);
    }
  }

  uiManagerIntegration() {
    try {
      // Enregistrer dans l'UIManager si disponible
      if (window.uiManager || window.pokemonUISystem?.uiManager) {
        const uiManager = window.uiManager || window.pokemonUISystem.uiManager;
        
        if (uiManager.registerModule) {
          this.registerWithUIManager(uiManager);
        }
      }
      
      // Écouter les événements UIManager
      window.addEventListener('pokemonUIStateChanged', (e) => {
        this.handleUIStateChange(e.detail);
      }, { signal: this.abortController.signal });
      
    } catch (error) {
      this.warn("⚠️ Erreur intégration UIManager:", error);
    }
  }

  async registerWithUIManager(uiManager) {
    try {
      await uiManager.registerModule('teamManager', {
        factory: () => Promise.resolve(this),
        instance: this,
        dependencies: [],
        defaultState: this.uiManagerState,
        priority: this.uiManagerState.priority,
        layout: {
          type: 'icon',
          anchor: 'bottom-right',
          order: 2,
          spacing: 10
        }
      });
      
      this.log("✅ Enregistré dans UIManager");
      
    } catch (error) {
      this.warn("⚠️ Erreur enregistrement UIManager:", error);
    }
  }

  setupResponsiveHandling() {
    const handleResize = this.throttle(() => {
      if (this.teamUI?.handleResize) {
        this.teamUI.handleResize();
      }
      if (this.teamIcon?.adjustPosition) {
        this.teamIcon.adjustPosition();
      }
    }, 250);

    window.addEventListener('resize', handleResize, { 
      signal: this.abortController.signal 
    });
  }

  // ===== ⚡ OPTIMISATIONS PERFORMANCE =====

  setupPerformanceOptimizations() {
    this.log("⚡ Configuration optimisations performance...");
    
    // Setup du système de batch updates
    this.setupBatchUpdates();
    
    // Setup du cache intelligent
    this.setupCache();
    
    // Setup monitoring performance
    this.setupPerformanceMonitoring();
  }

  setupBatchUpdates() {
    // Traitement par batch des mises à jour
    this.processBatchUpdates = this.debounce(() => {
      if (this.updateQueue.size === 0 || this.isUpdating) return;
      
      this.isUpdating = true;
      const updates = Array.from(this.updateQueue);
      this.updateQueue.clear();
      
      // Traiter les updates par type
      const groupedUpdates = this.groupUpdatesByType(updates);
      
      this.rafId = requestAnimationFrame(() => {
        this.processGroupedUpdates(groupedUpdates);
        this.isUpdating = false;
        this.lastUpdate = Date.now();
      });
      
    }, 50);
  }

  scheduleUpdate(type, data) {
    this.updateQueue.add({ type, data, timestamp: Date.now() });
    this.processBatchUpdates();
  }

  groupUpdatesByType(updates) {
    const grouped = {};
    
    updates.forEach(update => {
      if (!grouped[update.type]) {
        grouped[update.type] = [];
      }
      grouped[update.type].push(update.data);
    });
    
    return grouped;
  }

  processGroupedUpdates(groupedUpdates) {
    try {
      // Traiter les stats en premier (plus critique)
      if (groupedUpdates.stats) {
        this.processStatsUpdates(groupedUpdates.stats);
      }
      
      // Puis les événements Pokémon
      if (groupedUpdates.pokemonAdded) {
        this.processPokemonEvents('added', groupedUpdates.pokemonAdded);
      }
      
      if (groupedUpdates.pokemonRemoved) {
        this.processPokemonEvents('removed', groupedUpdates.pokemonRemoved);
      }
      
      if (groupedUpdates.pokemonUpdated) {
        this.processPokemonEvents('updated', groupedUpdates.pokemonUpdated);
      }
      
    } catch (error) {
      this.handleError(error, 'batch_updates');
    }
  }

  setupCache() {
    // Cache intelligent avec invalidation automatique
    this.cache.maxAge = 30000; // 30 secondes
    this.cache.maxSize = 100;
    
    // Nettoyage périodique du cache
    const cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60000); // 1 minute
    
    this.abortController.signal.addEventListener('abort', () => {
      clearInterval(cleanupInterval);
    });
  }

  cleanupCache() {
    const now = Date.now();
    
    // Nettoyer les entrées expirées
    for (const [key, entry] of this.cache.renderedElements) {
      if (now - entry.timestamp > this.cache.maxAge) {
        this.cache.renderedElements.delete(key);
      }
    }
    
    // Limiter la taille du cache
    if (this.cache.renderedElements.size > this.cache.maxSize) {
      const entries = Array.from(this.cache.renderedElements.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, entries.length - this.cache.maxSize);
      toDelete.forEach(([key]) => this.cache.renderedElements.delete(key));
    }
  }

  setupPerformanceMonitoring() {
    this.performanceMetrics = {
      updateCount: 0,
      errorCount: 0,
      avgUpdateTime: 0,
      lastPerformanceCheck: Date.now()
    };
    
    // Monitoring périodique
    const monitorInterval = setInterval(() => {
      this.checkPerformance();
    }, 30000); // 30 secondes
    
    this.abortController.signal.addEventListener('abort', () => {
      clearInterval(monitorInterval);
    });
  }

  checkPerformance() {
    const now = Date.now();
    const timeSinceLastCheck = now - this.performanceMetrics.lastPerformanceCheck;
    
    // Calculer les métriques
    const updatesPerSecond = this.performanceMetrics.updateCount / (timeSinceLastCheck / 1000);
    
    // Ajuster les optimisations si nécessaire
    if (updatesPerSecond > 10) {
      this.updateThrottle = Math.min(this.updateThrottle * 1.2, 500);
      this.warn(`⚡ Performance: augmentation throttle à ${this.updateThrottle}ms`);
    } else if (updatesPerSecond < 2 && this.updateThrottle > 100) {
      this.updateThrottle = Math.max(this.updateThrottle * 0.8, 100);
      this.log(`⚡ Performance: réduction throttle à ${this.updateThrottle}ms`);
    }
    
    // Reset des compteurs
    this.performanceMetrics.updateCount = 0;
    this.performanceMetrics.lastPerformanceCheck = now;
  }

  // ===== 📨 GESTION ÉVÉNEMENTS OPTIMISÉE =====

  handleTeamDataUpdate(data) {
    try {
      // Vérifier si les données ont vraiment changé
      const dataHash = this.hashData(data);
      if (dataHash === this.cache.lastTeamData) {
        return; // Pas de changement, ignorer
      }
      
      this.cache.lastTeamData = dataHash;
      this.updateLocalTeamData(data);
      
      // Mettre à jour l'UI de manière optimisée
      if (this.teamUI) {
        this.teamUI.updateTeamData(data);
      }
      
      this.performanceMetrics.updateCount++;
      this.log("📊 Données équipe mises à jour");
      
    } catch (error) {
      this.handleError(error, 'team_data_update');
    }
  }

  handleTeamActionResult(data) {
    try {
      if (this.teamUI) {
        this.teamUI.handleTeamActionResult(data);
      }
      
      this.showNotification(
        data.message, 
        data.success ? 'success' : 'error',
        { duration: data.success ? 2000 : 4000 }
      );
      
      // Rafraîchir les données après une action
      this.scheduleDataRefresh();
      
    } catch (error) {
      this.handleError(error, 'team_action_result');
    }
  }

  handleTeamHealed(data) {
    try {
      this.showNotification('Équipe soignée!', 'success', { duration: 2000 });
      
      // Animation spéciale sur l'icône
      if (this.teamIcon) {
        this.teamIcon.onTeamUpdate({ type: 'healed' });
      }
      
      // Rafraîchir les données
      this.scheduleDataRefresh();
      
    } catch (error) {
      this.handleError(error, 'team_healed');
    }
  }

  handleTeamStats(data) {
    try {
      const statsHash = this.hashData(data);
      if (statsHash === this.cache.lastStatsHash) {
        return; // Stats identiques, ignorer
      }
      
      this.cache.lastStatsHash = statsHash;
      this.teamStats = { ...data };
      
      // Mettre à jour l'icône
      if (this.teamIcon) {
        this.teamIcon.updateTeamStats(data);
      }
      
      this.emit('statsUpdated', data);
      
    } catch (error) {
      this.handleError(error, 'team_stats');
    }
  }

  handleUIStateChange(stateData) {
    const { newState, previousState } = stateData;
    
    try {
      switch (newState) {
        case 'battle':
          this.setGameState('battle');
          break;
        case 'exploration':
          this.setGameState('exploration');
          break;
        case 'pokemonCenter':
          this.setGameState('pokemonCenter');
          break;
        case 'dialogue':
          this.setGameState('dialogue');
          break;
      }
    } catch (error) {
      this.handleError(error, 'ui_state_change');
    }
  }

  setGameState(state) {
    this.log(`🎮 Changement état: ${state}`);
    
    switch (state) {
      case 'battle':
        this.hideTeam();
        this.setEnabled(false);
        break;
      case 'exploration':
        this.setEnabled(true);
        break;
      case 'pokemonCenter':
        this.setEnabled(true);
        break;
      case 'dialogue':
        this.setEnabled(false);
        break;
    }
  }

  // ===== 🎯 MÉTHODES PUBLIQUES OPTIMISÉES =====

  toggleTeam() {
    if (!this.canPlayerInteract()) {
      this.showCannotInteractMessage();
      return false;
    }

    if (this.teamUI) {
      return this.teamUI.toggle();
    }
    
    return false;
  }

  openTeam() {
    if (!this.canPlayerInteract()) {
      this.showCannotInteractMessage();
      return false;
    }

    if (this.teamUI) {
      return this.teamUI.show();
    }
    
    return false;
  }

  closeTeam() {
    if (this.teamUI) {
      return this.teamUI.hide();
    }
    
    return false;
  }

  hideTeam() {
    if (this.teamUI) {
      this.teamUI.hide();
    }
    if (this.teamIcon) {
      this.teamIcon.hide();
    }
  }

  showTeam() {
    if (this.teamIcon) {
      this.teamIcon.show();
    }
  }

  setEnabled(enabled) {
    this.uiManagerState.enabled = enabled;
    
    if (this.teamIcon) {
      this.teamIcon.setEnabled(enabled);
    }
    
    if (this.teamUI) {
      this.teamUI.setEnabled(enabled);
    }
  }

  // ===== 🔧 ACTIONS ÉQUIPE OPTIMISÉES =====

  requestTeamData() {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("getTeam");
      this.lastTeamDataRequest = Date.now();
    }
  }

  healTeam() {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("healTeam");
      this.showNotification("Soignage en cours...", "info", { duration: 1000 });
    }
  }

  healPokemon(pokemonId) {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("healPokemon", { pokemonId });
    }
  }

  removePokemon(pokemonId) {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("removeFromTeam", { pokemonId });
    }
  }

  swapPokemon(fromSlot, toSlot) {
    if (this.gameRoom && this.canSendRequest()) {
      this.gameRoom.send("swapTeamSlots", { slotA: fromSlot, slotB: toSlot });
    }
  }

  canSendRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - (this.lastTeamDataRequest || 0);
    return timeSinceLastRequest > 1000; // 1 seconde de cooldown
  }

  scheduleDataRefresh() {
    // Rafraîchir les données après un délai
    setTimeout(() => {
      this.requestTeamData();
    }, 500);
  }

  // ===== 🛡️ GESTION D'ERREUR AVANCÉE =====

  handleError(error, context = 'unknown') {
    this.performanceMetrics.errorCount++;
    
    console.error(`❌ [TeamManager:${context}]`, error);
    
    // Stratégies de récupération selon le contexte
    switch (context) {
      case 'initialization':
        this.handleInitializationError(error);
        break;
      case 'ui_creation':
        this.handleUICreationError(error);
        break;
      case 'server_listeners':
        this.handleServerError(error);
        break;
      default:
        this.handleGenericError(error);
    }
    
    // Notifier l'erreur
    this.emit('error', { error, context });
  }

  handleInitializationError(error) {
    // Tentative de réinitialisation
    setTimeout(() => {
      this.reinitialize();
    }, 2000);
  }

  handleUICreationError(error) {
    // Créer une UI de fallback
    this.createFallbackUI();
  }

  handleServerError(error) {
    // Réessayer la connexion serveur
    setTimeout(() => {
      this.setupServerListeners();
    }, 5000);
  }

  handleGenericError(error) {
    // Log et continue
    this.warn(`⚠️ Erreur générique: ${error.message}`);
  }

  createFallbackUI() {
    this.warn("🆘 Création UI de secours...");
    
    // UI minimaliste en cas d'échec
    this.teamIcon = {
      show: () => this.log("Fallback show"),
      hide: () => this.log("Fallback hide"),
      setEnabled: (enabled) => this.log(`Fallback enabled: ${enabled}`),
      updateTeamStats: (stats) => this.log("Fallback stats update"),
      iconElement: document.createElement('div')
    };
  }

  // ===== 🧹 NETTOYAGE ET DESTRUCTION =====

  destroy() {
    this.log("🧹 Destruction TeamManager...");
    
    try {
      // Annuler tous les événements
      this.abortController.abort();
      
      // Annuler les animations en cours
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
      
      // Nettoyer l'UI
      if (this.teamUI && typeof this.teamUI.destroy === 'function') {
        this.teamUI.destroy();
      }
      
      if (this.teamIcon && typeof this.teamIcon.destroy === 'function') {
        this.teamIcon.destroy();
      }
      
      // Nettoyer le cache
      this.cache.renderedElements.clear();
      
      // Nettoyer les références globales
      this.cleanupGlobalReferences();
      
      // Reset état
      this.isInitialized = false;
      this.uiManagerState.initialized = false;
      
      this.log("✅ TeamManager détruit");
      
    } catch (error) {
      console.error("❌ Erreur destruction TeamManager:", error);
    }
  }

  cleanupGlobalReferences() {
    if (window.TeamManager === this) {
      window.TeamManager = null;
    }
    if (window.teamSystem === this) {
      window.teamSystem = null;
    }
    if (window.teamManagerGlobal === this) {
      window.teamManagerGlobal = null;
    }
  }

  async reinitialize() {
    this.log("🔄 Réinitialisation TeamManager...");
    
    try {
      // Nettoyer d'abord
      this.destroy();
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Réinitialiser
      await this.init();
      
      this.log("✅ Réinitialisation réussie");
      
    } catch (error) {
      console.error("❌ Échec réinitialisation:", error);
    }
  }

  // ===== 🛠️ UTILITAIRES OPTIMISÉS =====

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

  canPlayerInteract() {
    return this.teamUI ? this.teamUI.canPlayerInteract() : true;
  }

  showCannotInteractMessage() {
    this.showNotification(
      "Cannot open team right now", 
      "warning", 
      { duration: 2000 }
    );
  }

  showNotification(message, type = 'info', options = {}) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, type, options);
    } else {
      this.log(`📢 [${type}]: ${message}`);
    }
  }

  handleIconClick() {
    if (this.canPlayerInteract()) {
      this.toggleTeam();
    } else {
      this.showCannotInteractMessage();
    }
  }

  setupAutoSave() {
    const autoSaveInterval = setInterval(() => {
      this.autoSave();
    }, this.config.saveInterval);
    
    this.abortController.signal.addEventListener('abort', () => {
      clearInterval(autoSaveInterval);
    });
  }

  autoSave() {
    try {
      const saveData = {
        teamData: this.teamData,
        teamStats: this.teamStats,
        timestamp: Date.now()
      };
      
      // Sauvegarder en sessionStorage (localStorage n'est pas supporté)
      sessionStorage.setItem('teamManager_autoSave', JSON.stringify(saveData));
      
    } catch (error) {
      this.warn("⚠️ Erreur auto-save:", error);
    }
  }

  // ===== 📊 GETTERS OPTIMISÉS =====

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

  isTeamOpen() {
    return this.teamUI ? this.teamUI.isVisible : false;
  }

  getPokemonBySlot(slot) {
    return this.teamData[slot] || null;
  }

  getAlivePokemon() {
    return this.teamData.filter(p => p && p.currentHp > 0);
  }

  // ===== 🔧 MÉTHODES UIMANAGER COMPATIBLES =====

  show() {
    this.uiManagerState.visible = true;
    this.showTeam();
    return true;
  }

  hide() {
    this.uiManagerState.visible = false;
    this.hideTeam();
    return true;
  }

  getUIManagerState() {
    return {
      ...this.uiManagerState,
      teamStats: this.teamStats,
      isOpen: this.isTeamOpen(),
      canBattle: this.canBattle(),
      performance: {
        updateCount: this.performanceMetrics.updateCount,
        errorCount: this.performanceMetrics.errorCount,
        cacheSize: this.cache.renderedElements.size
      }
    };
  }

  // ===== 🎛️ UTILITAIRES PERFORMANCE =====

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  hashData(data) {
    // Hash simple mais efficace pour détecter les changements
    return JSON.stringify(data).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
  }

  // ===== 📢 SYSTÈME D'ÉVÉNEMENTS =====

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.warn(`⚠️ Erreur callback événement ${event}:`, error);
        }
      });
    }
  }

  // ===== 🐛 LOGGING OPTIMISÉ =====

  log(...args) {
    if (this.config.enableDebugLogs) {
      console.log('[TeamManager]', ...args);
    }
  }

  warn(...args) {
    console.warn('[TeamManager]', ...args);
  }

  error(...args) {
    console.error('[TeamManager]', ...args);
  }

  // ===== 📊 MÉTHODES DE DEBUG =====

  debugInfo() {
    return {
      initialized: this.isInitialized,
      teamData: this.teamData.length,
      teamStats: this.teamStats,
      performance: this.performanceMetrics,
      cache: {
        size: this.cache.renderedElements.size,
        lastTeamData: !!this.cache.lastTeamData,
        lastStatsHash: !!this.cache.lastStatsHash
      },
      uiComponents: {
        teamUI: !!this.teamUI,
        teamIcon: !!this.teamIcon
      },
      config: this.config
    };
  }

  enableDebugMode() {
    this.config.enableDebugLogs = true;
    this.log("🐛 Mode debug activé");
  }

  disableDebugMode() {
    this.config.enableDebugLogs = false;
  }

  performanceReport() {
    const report = {
      metrics: this.performanceMetrics,
      cache: {
        size: this.cache.renderedElements.size,
        hitRate: this.cache.hitRate || 0
      },
      config: {
        updateThrottle: this.updateThrottle,
        batchUpdates: this.config.batchUpdates
      },
      recommendations: []
    };

    // Ajouter des recommandations basées sur les métriques
    if (this.performanceMetrics.errorCount > 5) {
      report.recommendations.push("Beaucoup d'erreurs détectées - vérifier la stabilité");
    }

    if (this.updateThrottle > 200) {
      report.recommendations.push("Throttle élevé - considérer optimiser les updates");
    }

    return report;
  }
}

export default TeamManager;
