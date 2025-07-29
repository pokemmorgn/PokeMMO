// Pokedex/PokedexSystem.js - Système Pokédx avec traductions temps réel
// 🌐 Support complet des traductions à chaud selon le pattern établi

import { PokedexUI } from './PokedexUI.js';
import { PokedexIcon } from './PokedexIcon.js';
import { t } from '../managers/LocalizationManager.js';

export class PokedexSystem {
  constructor(scene, gameRoom, optionsManager = null) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.optionsManager = optionsManager;
    this.cleanupLanguageListener = null;
    
    this.pokedxUI = null;
    this.pokedxIcon = null;
    
    // Données Pokédx
    this.pokedxData = {};
    this.playerStats = {};
    this.notifications = [];
    this.settings = {};
    
    // Cache local
    this.pokemonCache = new Map();
    this.searchCache = new Map();
    this.lastSyncTime = null;
    
    // État
    this.isInitialized = false;
    this.isSyncing = false;
    this._isRequestingData = false;
    this._lastRequestTime = null;
    this._requestCooldown = 2000;
    
    this.init();
  }

  // === 🚀 INITIALISATION ===
  
  init() {
    console.log('🚀 [PokedexSystem] Initialisation...');
    
    this.pokedxUI = new PokedexUI(this.gameRoom, this.optionsManager);
    this.pokedxIcon = new PokedexIcon(this.pokedxUI, this.optionsManager);
    
    this.setupInteractions();
    this.setupServerListeners();
    this.setupLanguageSupport();
    this.initializeDefaultData();
    
    window.pokedxSystem = this;
    this.isInitialized = true;
    
    console.log('✅ [PokedexSystem] Initialisé avec traductions');
  }
  
  // === 🌐 SUPPORT LANGUE ===
  
  setupLanguageSupport() {
    if (this.optionsManager?.addLanguageListener) {
      this.cleanupLanguageListener = this.optionsManager.addLanguageListener(() => {
        this.updateLanguage();
      });
    }
    
    this.updateLanguage();
  }
  
  updateLanguage() {
    // Les composants UI et Icon gèrent leurs propres traductions
    // Le système peut gérer les notifications ici si besoin
    try {
      this.updateNotificationMessages();
    } catch (error) {
      console.error('❌ [PokedexSystem] Erreur mise à jour langue:', error);
    }
  }
  
  updateNotificationMessages() {
    // Mettre à jour les messages des notifications en cache
    this.notifications = this.notifications.map(notification => {
      const updatedNotification = { ...notification };
      
      switch (notification.type) {
        case 'discovery':
          updatedNotification.message = t('pokedx.ui.notifications.new_discovery');
          break;
        case 'capture':
          updatedNotification.message = t('pokedx.ui.notifications.new_capture');
          break;
        case 'milestone':
          if (notification.milestone) {
            updatedNotification.message = t('pokedx.ui.notifications.milestone')
              .replace('{percent}', notification.milestone);
          }
          break;
      }
      
      return updatedNotification;
    });
  }
  
  // === 🔧 MÉTHODE D'INJECTION TARDIVE ===
  
  setOptionsManager(optionsManager) {
    this.optionsManager = optionsManager;
    
    if (this.pokedxUI) {
      this.pokedxUI.optionsManager = optionsManager;
      this.pokedxUI.setupLanguageSupport?.();
    }
    
    if (this.pokedxIcon) {
      this.pokedxIcon.optionsManager = optionsManager;
      this.pokedxIcon.setupLanguageSupport?.();
    }
    
    this.setupLanguageSupport();
  }
  
  setupInteractions() {
    if (this.pokedxIcon) {
      this.pokedxIcon.onClick = () => {
        if (this.canPlayerInteract()) {
          this.pokedxUI.toggle();
        }
      };
    }
    
    this.setupKeyboardShortcuts();
    this.setupSystemIntegration();
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.canPlayerInteract()) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          this.togglePokedx();
          break;
        case 'f':
          if (e.ctrlKey && this.pokedxUI.isVisible) {
            e.preventDefault();
            this.pokedxUI.openToView('search');
          }
          break;
      }
    });
  }
  
  setupSystemIntegration() {
    if (window.questSystem) {
      this.onPokemonCaptured = (pokemonData) => {
        window.questSystem.triggerCaptureEvent(pokemonData.pokemonId, pokemonData);
      };
    }
    
    if (typeof window.isChatFocused === 'function') {
      const chatInput = document.querySelector('#chat-input');
      if (chatInput) {
        chatInput.addEventListener('focus', () => {
          this.pokedxIcon.setEnabled(false);
        });
        chatInput.addEventListener('blur', () => {
          this.pokedxIcon.setEnabled(true);
        });
      }
    }
  }
  
  initializeDefaultData() {
    this.playerStats = {
      totalSeen: 0,
      totalCaught: 0,
      totalShiny: 0,
      seenPercentage: 0,
      caughtPercentage: 0,
      favoriteCount: 0,
      lastActivity: new Date(),
      streaks: {
        dailyDiscoveries: 0,
        dailyCaptures: 0
      }
    };
    
    this.settings = {
      discoveryNotifications: true,
      captureNotifications: true,
      shinyNotifications: true,
      milestoneNotifications: true,
      soundEnabled: true,
      animationsEnabled: true
    };
    
    this.updateIconProgress();
  }

  // === 📡 COMMUNICATION SERVEUR ===
  
  setupServerListeners() {
    if (!this.gameRoom) return;

    // Réception données Pokédx
    this.gameRoom.onMessage("pokedx:get", (response) => {
      this.handlePokedxDataResponse(response);
    });

    this.gameRoom.onMessage("pokedx:entry", (response) => {
      this.handlePokemonEntryResponse(response);
    });

    this.gameRoom.onMessage("pokedx:stats", (response) => {
      this.handleStatsResponse(response);
    });

    // Événements de découverte/capture
    this.gameRoom.onMessage("pokedx:discovery", (data) => {
      this.handleDiscoveryEvent(data);
    });

    this.gameRoom.onMessage("pokedx:capture", (data) => {
      this.handleCaptureEvent(data);
    });

    // Réponses d'actions
    this.gameRoom.onMessage("pokedx:mark_seen", (response) => {
      this.handleMarkSeenResponse(response);
    });

    this.gameRoom.onMessage("pokedx:mark_caught", (response) => {
      this.handleMarkCaughtResponse(response);
    });

    this.gameRoom.onMessage("pokedx:toggle_favorite", (response) => {
      this.handleFavoriteResponse(response);
    });

    this.gameRoom.onMessage("pokedx:notifications", (response) => {
      this.handleNotificationsResponse(response);
    });

    this.gameRoom.onMessage("pokedx:quick_action", (response) => {
      this.handleQuickActionResponse(response);
    });
  }
  
  // === 📤 REQUÊTES SERVEUR ===
  
  requestPokedxData(filters = {}) {
    if (!this.gameRoom) return;
    
    const now = Date.now();
    if (this._isRequestingData) {
      return;
    }
    
    if (this._lastRequestTime && (now - this._lastRequestTime) < this._requestCooldown) {
      return;
    }
    
    this._isRequestingData = true;
    this._lastRequestTime = now;
    
    this.gameRoom.send("pokedx:get", {
      filters: {
        sortBy: 'id',
        sortOrder: 'asc',
        limit: 50,
        offset: 0,
        ...filters
      }
    });
    
    setTimeout(() => {
      this._isRequestingData = false;
    }, 3000);
  }
  
  requestPokemonEntry(pokemonId) {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:entry", {
      pokemonId: pokemonId,
      includeEvolutions: true,
      includeRecommendations: true
    });
  }
  
  requestPlayerStats() {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:stats");
  }
  
  markPokemonSeen(pokemonId, level, location, options = {}) {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:mark_seen", {
      pokemonId: pokemonId,
      level: level,
      location: location,
      method: options.method || 'wild',
      weather: options.weather,
      timeOfDay: options.timeOfDay,
      sessionId: options.sessionId,
      biome: options.biome,
      difficulty: options.difficulty,
      isEvent: options.isEvent || false
    });
  }
  
  markPokemonCaught(pokemonId, level, location, ownedPokemonId, options = {}) {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:mark_caught", {
      pokemonId: pokemonId,
      level: level,
      location: location,
      ownedPokemonId: ownedPokemonId,
      method: options.method || 'wild',
      weather: options.weather,
      timeOfDay: options.timeOfDay,
      isShiny: options.isShiny || false,
      captureTime: options.captureTime || Date.now(),
      ballType: options.ballType || 'poke_ball',
      isFirstAttempt: options.isFirstAttempt,
      criticalCapture: options.criticalCapture,
      experienceGained: options.experienceGained
    });
  }
  
  togglePokemonFavorite(pokemonId) {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:toggle_favorite", {
      pokemonId: pokemonId
    });
  }
  
  searchPokemon(filters = {}) {
    if (!this.gameRoom) return;
    
    const cacheKey = JSON.stringify(filters);
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }
    
    this.requestPokedxData(filters);
    return [];
  }
  
  syncPokedx() {
    if (!this.gameRoom || this.isSyncing) return;
    
    this.isSyncing = true;
    this.gameRoom.send("pokedx:quick_action", {
      action: "force_sync"
    });
  }
  
  markNotificationRead(notificationId) {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:notification_read", {
      notificationId: notificationId
    });
  }
  
  markAllNotificationsRead() {
    if (!this.gameRoom) return;
    
    this.gameRoom.send("pokedx:notification_read", {
      markAllRead: true
    });
  }

  // === 📥 TRAITEMENT RÉPONSES SERVEUR ===
  
  handlePokedxDataResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur données Pokédx:', response.error);
      this.showError(t('pokedx.disabled_message'));
      return;
    }
    
    this.pokedxData = response.data.entries || [];
    this.playerStats = { ...this.playerStats, ...response.data.summary };
    
    if (response.data.entries) {
      response.data.entries.forEach(entry => {
        this.pokemonCache.set(entry.pokemonId, entry);
      });
    }
    
    this.updateIconProgress();
    this.lastSyncTime = new Date();
  }
  
  handlePokemonEntryResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur entrée Pokémon:', response.error);
      return;
    }
    
    if (response.data.entry) {
      this.pokemonCache.set(response.data.entry.pokemonId, response.data.entry);
    }
  }
  
  handleStatsResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur statistiques:', response.error);
      return;
    }
    
    this.playerStats = { ...this.playerStats, ...response.data };
    this.updateIconProgress();
  }
  
  handleDiscoveryEvent(data) {
    if (data.pokemonId) {
      const entry = this.pokemonCache.get(data.pokemonId) || {};
      entry.seen = true;
      entry.firstSeen = entry.firstSeen || new Date();
      this.pokemonCache.set(data.pokemonId, entry);
      
      this.playerStats.totalSeen = (this.playerStats.totalSeen || 0) + 1;
    }
    
    this.pokedxIcon?.animateNewDiscovery();
    this.pokedxIcon?.showDiscoveryNotification(data);
    this.pokedxIcon?.playDiscoverySound();
    
    this.addNotification({
      type: 'discovery',
      pokemonId: data.pokemonId,
      message: t('pokedx.ui.notifications.new_discovery'),
      timestamp: new Date(),
      priority: 'medium'
    });
    
    this.updateIconProgress();
  }
  
  handleCaptureEvent(data) {
    if (data.pokemonId) {
      const entry = this.pokemonCache.get(data.pokemonId) || {};
      entry.seen = true;
      entry.caught = true;
      entry.firstCaught = entry.firstCaught || new Date();
      if (data.isShiny) entry.shiny = true;
      this.pokemonCache.set(data.pokemonId, entry);
      
      this.playerStats.totalCaught = (this.playerStats.totalCaught || 0) + 1;
      if (data.isShiny) {
        this.playerStats.totalShiny = (this.playerStats.totalShiny || 0) + 1;
      }
    }
    
    this.pokedxIcon?.animateCapture();
    this.pokedxIcon?.showCaptureNotification(data);
    this.pokedxIcon?.playCaptureSound();
    
    const notificationType = data.isShiny ? 'shiny_capture' : 'capture';
    const message = data.isShiny ? 
      `${t('pokedx.ui.notifications.new_capture')} ✨` : 
      t('pokedx.ui.notifications.new_capture');
    
    this.addNotification({
      type: notificationType,
      pokemonId: data.pokemonId,
      message: message,
      timestamp: new Date(),
      priority: data.isShiny ? 'high' : 'medium'
    });
    
    this.checkMilestones();
    this.updateIconProgress();
  }
  
  handleMarkSeenResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur marquer vu:', response.error);
      return;
    }
    
    if (response.data.notifications) {
      response.data.notifications.forEach(notification => {
        this.addNotification(notification);
      });
    }
    
    if (response.data.isNewDiscovery) {
      this.handleDiscoveryEvent({
        pokemonId: response.data.pokemonId || 0,
        notifications: response.data.notifications
      });
    }
  }
  
  handleMarkCaughtResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur marquer capturé:', response.error);
      return;
    }
    
    if (response.data.notifications) {
      response.data.notifications.forEach(notification => {
        this.addNotification(notification);
      });
    }
    
    if (response.data.isNewCapture) {
      this.handleCaptureEvent({
        pokemonId: response.data.pokemonId || 0,
        isNewCapture: response.data.isNewCapture,
        isShiny: response.data.isShiny || false,
        notifications: response.data.notifications
      });
    }
  }
  
  handleFavoriteResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur favori:', response.error);
      return;
    }
    
    const entry = this.pokemonCache.get(response.data.pokemonId);
    if (entry) {
      entry.favorited = response.data.favorited;
      this.pokemonCache.set(response.data.pokemonId, entry);
    }
    
    if (response.data.favorited) {
      this.playerStats.favoriteCount = (this.playerStats.favoriteCount || 0) + 1;
    } else {
      this.playerStats.favoriteCount = Math.max(0, (this.playerStats.favoriteCount || 0) - 1);
    }
  }
  
  handleNotificationsResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur notifications:', response.error);
      return;
    }
    
    this.notifications = response.data.notifications || [];
    
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.pokedxIcon?.updateNotification(unreadCount > 0, unreadCount);
  }
  
  handleQuickActionResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur action rapide:', response.error);
      return;
    }
    
    if (response.data.action === 'force_sync') {
      this.isSyncing = false;
      this.lastSyncTime = new Date();
      
      setTimeout(() => {
        this.requestPokedxData();
        this.requestPlayerStats();
      }, 500);
    }
  }

  // === 📊 GESTION DES DONNÉES ===
  
  updateIconProgress() {
    if (!this.pokedxIcon) return;
    
    const totalPokemon = 1025;
    const seenPercentage = Math.round((this.playerStats.totalSeen / totalPokemon) * 100);
    const caughtPercentage = Math.round((this.playerStats.totalCaught / totalPokemon) * 100);
    
    this.playerStats.seenPercentage = seenPercentage;
    this.playerStats.caughtPercentage = caughtPercentage;
    
    this.pokedxIcon.updateProgress({
      totalSeen: this.playerStats.totalSeen || 0,
      totalCaught: this.playerStats.totalCaught || 0,
      seenPercentage: seenPercentage,
      caughtPercentage: caughtPercentage
    });
  }
  
  checkMilestones() {
    const caughtPercentage = this.playerStats.caughtPercentage || 0;
    const milestones = [10, 25, 50, 75, 90, 100];
    
    for (const milestone of milestones) {
      if (caughtPercentage >= milestone && !this.hasReachedMilestone(milestone)) {
        this.reachMilestone(milestone);
        break;
      }
    }
  }
  
  hasReachedMilestone(percentage) {
    return false;
  }
  
  reachMilestone(percentage) {
    this.pokedxIcon?.animateMilestone(percentage);
    
    this.addNotification({
      type: 'milestone',
      message: t('pokedx.ui.notifications.milestone').replace('{percent}', percentage),
      timestamp: new Date(),
      priority: 'high',
      milestone: percentage
    });
    
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(
        `🏆 ${t('pokedx.ui.notifications.milestone').replace('{percent}', percentage)}`,
        'achievement',
        { duration: 5000, sound: true }
      );
    }
  }
  
  addNotification(notification) {
    if (!notification.id) {
      notification.id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    this.notifications.unshift(notification);
    
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.pokedxIcon?.updateNotification(unreadCount > 0, unreadCount);
  }

  // === 🎮 API PUBLIQUE ===
  
  togglePokedx() {
    if (this.pokedxUI) {
      this.pokedxUI.toggle();
    }
  }
  
  openPokedx() {
    if (this.pokedxUI) {
      this.pokedxUI.show();
    }
  }
  
  closePokedx() {
    if (this.pokedxUI) {
      this.pokedxUI.hide();
    }
  }
  
  isPokedxOpen() {
    return this.pokedxUI ? this.pokedxUI.isVisible : false;
  }
  
  openPokedxToView(viewName) {
    if (this.pokedxUI) {
      this.pokedxUI.openToView(viewName);
    }
  }
  
  isPokemonSeen(pokemonId) {
    const entry = this.pokemonCache.get(pokemonId);
    return entry ? entry.seen === true : false;
  }
  
  isPokemonCaught(pokemonId) {
    const entry = this.pokemonCache.get(pokemonId);
    return entry ? entry.caught === true : false;
  }
  
  isPokemonFavorite(pokemonId) {
    const entry = this.pokemonCache.get(pokemonId);
    return entry ? entry.favorited === true : false;
  }
  
  getPokemonEntry(pokemonId) {
    return this.pokemonCache.get(pokemonId) || null;
  }
  
  getPlayerStats() {
    return { ...this.playerStats };
  }
  
  getNotifications() {
    return [...this.notifications];
  }
  
  getFavoritesPokemon() {
    const favorites = [];
    this.pokemonCache.forEach((entry, pokemonId) => {
      if (entry.favorited) {
        favorites.push({ ...entry, pokemonId });
      }
    });
    return favorites.sort((a, b) => a.pokemonId - b.pokemonId);
  }
  
  getCompletionRate() {
    return this.playerStats.caughtPercentage || 0;
  }
  
  getSeenCount() {
    return this.playerStats.totalSeen || 0;
  }
  
  getCaughtCount() {
    return this.playerStats.totalCaught || 0;
  }
  
  getShinyCount() {
    return this.playerStats.totalShiny || 0;
  }

  // === 🛠️ MÉTHODES UTILITAIRES ===
  
  canPlayerInteract() {
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatOpen = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    const battleActive = document.querySelector('.battle-ui') !== null;
    
    return !questDialogOpen && !chatOpen && !starterHudOpen && !battleActive;
  }
  
  showError(message) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'error', { duration: 4000 });
    } else {
      console.error('❌ [PokedexSystem]', message);
    }
  }
  
  showSuccess(message) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'success', { duration: 3000 });
    }
  }
  
  exportData() {
    return {
      playerStats: this.playerStats,
      settings: this.settings,
      lastSyncTime: this.lastSyncTime,
      cacheSize: this.pokemonCache.size,
      notificationCount: this.notifications.length
    };
  }
  
  importData(data) {
    if (data.playerStats) {
      this.playerStats = { ...this.playerStats, ...data.playerStats };
    }
    if (data.settings) {
      this.settings = { ...this.settings, ...data.settings };
    }
    if (data.lastSyncTime) {
      this.lastSyncTime = new Date(data.lastSyncTime);
    }
    
    this.updateIconProgress();
  }
  
  clearCache() {
    this.pokemonCache.clear();
    this.searchCache.clear();
  }
  
  getServiceStats() {
    return {
      isInitialized: this.isInitialized,
      isSyncing: this.isSyncing,
      cacheSize: this.pokemonCache.size,
      searchCacheSize: this.searchCache.size,
      notificationCount: this.notifications.length,
      lastSyncTime: this.lastSyncTime,
      playerStats: this.playerStats,
      hasLanguageSupport: !!this.optionsManager
    };
  }

  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [PokedexSystem] Destruction...');
    
    if (this.cleanupLanguageListener) {
      this.cleanupLanguageListener();
      this.cleanupLanguageListener = null;
    }
    
    if (this.pokedxUI) {
      this.pokedxUI.destroy();
      this.pokedxUI = null;
    }
    
    if (this.pokedxIcon) {
      this.pokedxIcon.destroy();
      this.pokedxIcon = null;
    }
    
    this.pokemonCache.clear();
    this.searchCache.clear();
    
    this.pokedxData = {};
    this.playerStats = {};
    this.notifications = [];
    this.settings = {};
    
    this.isInitialized = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.optionsManager = null;
    
    if (window.pokedxSystem === this) {
      delete window.pokedxSystem;
    }
    
    console.log('✅ [PokedexSystem] Détruit avec nettoyage traductions');
  }
}

export default PokedexSystem;
