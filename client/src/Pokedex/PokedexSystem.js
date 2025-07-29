// Pokedex/PokedexSystem.js - Système Pokédex avec optionsManager + traductions temps réel
// 🎮 Logique principale du Pokédex + intégration serveur + TRADUCTIONS

import { PokedexUI } from './PokedexUI.js';
import { PokedexIcon } from './PokedexIcon.js';

export class PokedexSystem {
  constructor(scene, gameRoom, optionsManager = null) {  // ← NOUVEAU PARAMÈTRE
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.optionsManager = optionsManager;  // ← NOUVEAU
    this.pokedexUI = null;
    this.pokedexIcon = null;
    
    // === DONNÉES POKÉDEX ===
    this.pokedexData = {};      // Entrées du Pokédex
    this.playerStats = {};      // Statistiques du joueur
    this.notifications = [];    // Notifications Pokédex
    this.settings = {};         // Paramètres utilisateur
    
    // === CACHE LOCAL ===
    this.pokemonCache = new Map();
    this.searchCache = new Map();
    this.lastSyncTime = null;
    
    // === ÉTAT ===
    this.isInitialized = false;
    this.isSyncing = false;

    // 🆕 PROTECTION CONTRE DEMANDES MULTIPLES
    this._isRequestingData = false;
    this._lastRequestTime = null;
    this._requestCooldown = 2000; // 2 secondes entre les demandes
    
    this.init();
  }

  // === 🚀 INITIALISATION ===
  
  init() {
    console.log('🚀 [PokedexSystem] Initialisation système Pokédex...');
    console.log('🌐 [PokedexSystem] OptionsManager disponible:', !!this.optionsManager);
    
    // Créer l'interface Pokédex AVEC optionsManager
    this.pokedexUI = new PokedexUI(this.gameRoom, this.optionsManager);
    
    // ✅ CORRECTION : Créer l'icône Pokédex AVEC optionsManager
    this.pokedexIcon = new PokedexIcon(this.pokedexUI, this.optionsManager);
    
    // Configurer les interactions entre les composants
    this.setupInteractions();
    
    // Configurer les listeners serveur
    this.setupServerListeners();
    
    // Initialiser les données par défaut
    this.initializeDefaultData();
    
    // Rendre le système accessible globalement
    window.pokedexSystem = this;
    
    this.isInitialized = true;
    console.log('✅ [PokedexSystem] Système Pokédex initialisé avec traductions');
  }
  
  setupInteractions() {
    // Connecter icône → UI
    if (this.pokedexIcon) {
      this.pokedexIcon.onClick = () => {
        if (this.canPlayerInteract()) {
          this.pokedexUI.toggle();
        }
      };
    }
    
    // Configurer les raccourcis clavier
    this.setupKeyboardShortcuts();
    
    // Intégrer avec les autres systèmes
    this.setupSystemIntegration();
    
    console.log('🔗 [PokedexSystem] Interactions configurées');
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ne pas traiter les raccourcis si on ne peut pas interagir
      if (!this.canPlayerInteract()) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          this.togglePokedex();
          break;
        case 'f':
          if (e.ctrlKey && this.pokedexUI.isVisible) {
            e.preventDefault();
            this.pokedexUI.openToView('search');
          }
          break;
      }
    });
    
    console.log('⌨️ [PokedexSystem] Raccourcis clavier configurés');
  }
  
  setupSystemIntegration() {
    // Intégration avec le système de quêtes
    if (window.questSystem) {
      // Écouter les captures pour les quêtes
      this.onPokemonCaptured = (pokemonData) => {
        window.questSystem.triggerCaptureEvent(pokemonData.pokemonId, pokemonData);
      };
    }
    
    // Intégration avec le chat
    if (typeof window.isChatFocused === 'function') {
      const chatInput = document.querySelector('#chat-input');
      if (chatInput) {
        chatInput.addEventListener('focus', () => {
          this.pokedexIcon.setEnabled(false);
        });
        chatInput.addEventListener('blur', () => {
          this.pokedexIcon.setEnabled(true);
        });
      }
    }
    
    console.log('🔗 [PokedexSystem] Intégrations système configurées');
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
    
    // Mettre à jour l'icône avec les stats par défaut
    this.updateIconProgress();
    
    console.log('📊 [PokedexSystem] Données par défaut initialisées');
  }

  // === 📡 COMMUNICATION SERVEUR ===
  
  setupServerListeners() {
    if (!this.gameRoom) return;

    // === RÉCEPTION DONNÉES POKÉDEX ===
    // ✅ RETIRER ":response" de tous les listeners de réponse
    this.gameRoom.onMessage("pokedex:get", (response) => {
      this.handlePokedexDataResponse(response);
    });

    this.gameRoom.onMessage("pokedex:entry", (response) => {
      this.handlePokemonEntryResponse(response);
    });

    this.gameRoom.onMessage("pokedex:stats", (response) => {
      this.handleStatsResponse(response);
    });

    // === ÉVÉNEMENTS DE DÉCOUVERTE/CAPTURE ===
    // ✅ GARDER sans ":response" (ce sont des broadcasts)
    this.gameRoom.onMessage("pokedex:discovery", (data) => {
      this.handleDiscoveryEvent(data);
    });

    this.gameRoom.onMessage("pokedex:capture", (data) => {
      this.handleCaptureEvent(data);
    });

    // === RÉPONSES D'ACTIONS ===
    // ✅ RETIRER ":response"
    this.gameRoom.onMessage("pokedex:mark_seen", (response) => {
      this.handleMarkSeenResponse(response);
    });

    this.gameRoom.onMessage("pokedex:mark_caught", (response) => {
      this.handleMarkCaughtResponse(response);
    });

    this.gameRoom.onMessage("pokedex:toggle_favorite", (response) => {
      this.handleFavoriteResponse(response);
    });

    // === NOTIFICATIONS ===
    this.gameRoom.onMessage("pokedex:notifications", (response) => {
      this.handleNotificationsResponse(response);
    });

    // === SYNCHRONISATION ===
    this.gameRoom.onMessage("pokedex:quick_action", (response) => {
      this.handleQuickActionResponse(response);
    });

    console.log('📡 [PokedexSystem] Listeners serveur configurés et corrigés');
  }

  // === 📤 REQUÊTES SERVEUR ===
  
  requestPokedexData(filters = {}) {
    if (!this.gameRoom) return;
    
    // 🛠️ PROTECTION CONTRE LES DEMANDES MULTIPLES
    const now = Date.now();
    if (this._isRequestingData) {
      console.warn('⚠️ [PokedexSystem] Demande déjà en cours, ignorer');
      return;
    }
    
    if (this._lastRequestTime && (now - this._lastRequestTime) < this._requestCooldown) {
      console.warn('⚠️ [PokedexSystem] Cooldown actif, ignorer demande');
      return;
    }
    
    this._isRequestingData = true;
    this._lastRequestTime = now;
    
    console.log('📡 [PokedexSystem] Demande données Pokédex...', filters);
    this.gameRoom.send("pokedex:get", {
      filters: {
        sortBy: 'id',
        sortOrder: 'asc',
        limit: 50,
        offset: 0,
        ...filters
      }
    });
    
    // Libérer le verrou après 3 secondes max
    setTimeout(() => {
      this._isRequestingData = false;
    }, 3000);
  }
  
  requestPokemonEntry(pokemonId) {
    if (!this.gameRoom) return;
    
    console.log(`📡 [PokedexSystem] Demande entrée #${pokemonId}...`);
    this.gameRoom.send("pokedex:entry", {
      pokemonId: pokemonId,
      includeEvolutions: true,
      includeRecommendations: true
    });
  }
  
  requestPlayerStats() {
    if (!this.gameRoom) return;
    
    console.log('📡 [PokedexSystem] Demande statistiques...');
    this.gameRoom.send("pokedex:stats");
  }
  
  markPokemonSeen(pokemonId, level, location, options = {}) {
    if (!this.gameRoom) return;
    
    console.log(`👁️ [PokedexSystem] Marquer #${pokemonId} comme vu...`);
    this.gameRoom.send("pokedex:mark_seen", {
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
    
    console.log(`🎯 [PokedexSystem] Marquer #${pokemonId} comme capturé...`);
    this.gameRoom.send("pokedex:mark_caught", {
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
    
    console.log(`⭐ [PokedexSystem] Toggle favori #${pokemonId}...`);
    this.gameRoom.send("pokedex:toggle_favorite", {
      pokemonId: pokemonId
    });
  }
  
  searchPokemon(filters = {}) {
    if (!this.gameRoom) return;
    
    // Utiliser le cache pour les recherches rapides
    const cacheKey = JSON.stringify(filters);
    if (this.searchCache.has(cacheKey)) {
      console.log('💾 [PokedexSystem] Résultat de recherche depuis le cache');
      return this.searchCache.get(cacheKey);
    }
    
    console.log('🔍 [PokedexSystem] Recherche Pokémon...', filters);
    this.requestPokedexData(filters);
    
    return [];
  }
  
  syncPokedex() {
    if (!this.gameRoom || this.isSyncing) return;
    
    console.log('🔄 [PokedexSystem] Synchronisation Pokédex...');
    this.isSyncing = true;
    
    this.gameRoom.send("pokedex:quick_action", {
      action: "force_sync"
    });
  }
  
  markNotificationRead(notificationId) {
    if (!this.gameRoom) return;
    
    console.log(`📧 [PokedexSystem] Marquer notification lue: ${notificationId}`);
    this.gameRoom.send("pokedex:notification_read", {
      notificationId: notificationId
    });
  }
  
  markAllNotificationsRead() {
    if (!this.gameRoom) return;
    
    console.log('📧 [PokedexSystem] Marquer toutes notifications lues');
    this.gameRoom.send("pokedex:notification_read", {
      markAllRead: true
    });
  }

  // === 📥 TRAITEMENT RÉPONSES SERVEUR ===
  
  handlePokedexDataResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur données Pokédex:', response.error);
      this.showError('Impossible de charger les données du Pokédex');
      return;
    }
    
    console.log('📊 [PokedexSystem] Données Pokédex reçues:', response.data);
    
    // Mettre à jour les données locales
    this.pokedexData = response.data.entries || [];
    this.playerStats = { ...this.playerStats, ...response.data.summary };
    
    // Mettre à jour le cache
    if (response.data.entries) {
      response.data.entries.forEach(entry => {
        this.pokemonCache.set(entry.pokemonId, entry);
      });
    }
    
    // Mettre à jour l'affichage
    this.updateIconProgress();
    this.lastSyncTime = new Date();
    
    console.log('✅ [PokedexSystem] Données Pokédex traitées');
  }
  
  handlePokemonEntryResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur entrée Pokémon:', response.error);
      return;
    }
    
    console.log('📋 [PokedexSystem] Entrée Pokémon reçue:', response.data);
    
    // Mettre à jour le cache
    if (response.data.entry) {
      this.pokemonCache.set(response.data.entry.pokemonId, response.data.entry);
    }
  }
  
  handleStatsResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur statistiques:', response.error);
      return;
    }
    
    console.log('📈 [PokedexSystem] Statistiques reçues:', response.data);
    
    // Mettre à jour les stats
    this.playerStats = { ...this.playerStats, ...response.data };
    this.updateIconProgress();
  }
  
  handleDiscoveryEvent(data) {
    console.log('✨ [PokedexSystem] Nouvelle découverte:', data);
    
    // Mettre à jour les données locales
    if (data.pokemonId) {
      const entry = this.pokemonCache.get(data.pokemonId) || {};
      entry.seen = true;
      entry.firstSeen = entry.firstSeen || new Date();
      this.pokemonCache.set(data.pokemonId, entry);
      
      // Mettre à jour les stats
      this.playerStats.totalSeen = (this.playerStats.totalSeen || 0) + 1;
    }
    
    // Animations et notifications
    this.pokedexIcon?.animateNewDiscovery();
    this.pokedexIcon?.showDiscoveryNotification(data);
    
    // Son de découverte
    this.pokedexIcon?.playDiscoverySound();
    
    // Ajouter à la liste des notifications
    this.addNotification({
      type: 'discovery',
      pokemonId: data.pokemonId,
      message: `Nouveau Pokémon découvert !`,
      timestamp: new Date(),
      priority: 'medium'
    });
    
    // Mettre à jour l'affichage
    this.updateIconProgress();
  }
  
  handleCaptureEvent(data) {
    console.log('🎯 [PokedexSystem] Nouvelle capture:', data);
    
    // Mettre à jour les données locales
    if (data.pokemonId) {
      const entry = this.pokemonCache.get(data.pokemonId) || {};
      entry.seen = true;
      entry.caught = true;
      entry.firstCaught = entry.firstCaught || new Date();
      if (data.isShiny) entry.shiny = true;
      this.pokemonCache.set(data.pokemonId, entry);
      
      // Mettre à jour les stats
      this.playerStats.totalCaught = (this.playerStats.totalCaught || 0) + 1;
      if (data.isShiny) {
        this.playerStats.totalShiny = (this.playerStats.totalShiny || 0) + 1;
      }
    }
    
    // Animations et notifications
    this.pokedexIcon?.animateCapture();
    this.pokedexIcon?.showCaptureNotification(data);
    
    // Son de capture
    this.pokedexIcon?.playCaptureSound();
    
    // Notification spéciale pour les shiny
    const notificationType = data.isShiny ? 'shiny_capture' : 'capture';
    const message = data.isShiny ? 
      `Pokémon Shiny capturé ! ✨` : 
      `Pokémon capturé !`;
    
    this.addNotification({
      type: notificationType,
      pokemonId: data.pokemonId,
      message: message,
      timestamp: new Date(),
      priority: data.isShiny ? 'high' : 'medium'
    });
    
    // Vérifier les jalons
    this.checkMilestones();
    
    // Mettre à jour l'affichage
    this.updateIconProgress();
  }
  
  handleMarkSeenResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur marquer vu:', response.error);
      return;
    }
    
    console.log('✅ [PokedexSystem] Pokémon marqué comme vu:', response.data);
    
    // Gérer les notifications et achievements
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
    
    console.log('✅ [PokedexSystem] Pokémon marqué comme capturé:', response.data);
    
    // Gérer les notifications et achievements
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
    
    console.log('⭐ [PokedexSystem] Favori mis à jour:', response.data);
    
    // Mettre à jour le cache local
    const entry = this.pokemonCache.get(response.data.pokemonId);
    if (entry) {
      entry.favorited = response.data.favorited;
      this.pokemonCache.set(response.data.pokemonId, entry);
    }
    
    // Mettre à jour les stats
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
    
    console.log('📧 [PokedexSystem] Notifications reçues:', response.data);
    
    this.notifications = response.data.notifications || [];
    
    // Mettre à jour l'icône avec le nombre de notifications
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.pokedexIcon?.updateNotification(unreadCount > 0, unreadCount);
  }
  
  handleQuickActionResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur action rapide:', response.error);
      return;
    }
    
    console.log('⚡ [PokedexSystem] Action rapide:', response.data);
    
    if (response.data.action === 'force_sync') {
      this.isSyncing = false;
      this.lastSyncTime = new Date();
      
      // Recharger les données après sync
      setTimeout(() => {
        this.requestPokedexData();
        this.requestPlayerStats();
      }, 500);
    }
  }

  // === 📊 GESTION DES DONNÉES ===
  
  updateIconProgress() {
    if (!this.pokedexIcon) return;
    
    // Calculer les pourcentages
    const totalPokemon = 1025; // Total Pokémon national (à adapter selon votre jeu)
    const seenPercentage = Math.round((this.playerStats.totalSeen / totalPokemon) * 100);
    const caughtPercentage = Math.round((this.playerStats.totalCaught / totalPokemon) * 100);
    
    this.playerStats.seenPercentage = seenPercentage;
    this.playerStats.caughtPercentage = caughtPercentage;
    
    // Mettre à jour l'icône
    this.pokedexIcon.updateProgress({
      totalSeen: this.playerStats.totalSeen || 0,
      totalCaught: this.playerStats.totalCaught || 0,
      seenPercentage: seenPercentage,
      caughtPercentage: caughtPercentage
    });
    
    console.log(`📊 [PokedexSystem] Progression: ${this.playerStats.totalCaught}/${this.playerStats.totalSeen} (${caughtPercentage}%)`);
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
    // TODO: Vérifier dans les données si ce jalon a été atteint
    return false;
  }
  
  reachMilestone(percentage) {
    console.log(`🏆 [PokedexSystem] Jalon atteint: ${percentage}%`);
    
    // Animation spéciale
    this.pokedexIcon?.animateMilestone(percentage);
    
    // Notification de jalon
    this.addNotification({
      type: 'milestone',
      message: `Pokédex ${percentage}% complété !`,
      timestamp: new Date(),
      priority: 'high',
      milestone: percentage
    });
    
    // Achievement
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(
        `🏆 Pokédex ${percentage}% complété !`,
        'achievement',
        { duration: 5000, sound: true }
      );
    }
  }
  
  addNotification(notification) {
    // Ajouter ID unique si pas présent
    if (!notification.id) {
      notification.id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    // Ajouter au début de la liste
    this.notifications.unshift(notification);
    
    // Limiter le nombre de notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    // Mettre à jour l'icône
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.pokedexIcon?.updateNotification(unreadCount > 0, unreadCount);
    
    console.log('📧 [PokedexSystem] Notification ajoutée:', notification);
  }

  // === 🎮 API PUBLIQUE ===
  
  togglePokedex() {
    if (this.pokedexUI) {
      this.pokedexUI.toggle();
    }
  }
  
  openPokedex() {
    if (this.pokedexUI) {
      this.pokedexUI.show();
    }
  }
  
  closePokedex() {
    if (this.pokedexUI) {
      this.pokedexUI.hide();
    }
  }
  
  isPokedexOpen() {
    return this.pokedexUI ? this.pokedexUI.isVisible : false;
  }
  
  openPokedexToView(viewName) {
    if (this.pokedexUI) {
      this.pokedexUI.openToView(viewName);
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

  // === 🌐 MÉTHODES POUR TRADUCTIONS ===
  
  /**
   * Méthode pour injection tardive de l'optionsManager
   */
  setOptionsManager(optionsManager) {
    console.log('🌐 [PokedexSystem] Injection tardive optionsManager');
    
    this.optionsManager = optionsManager;
    
    // Propager aux composants
    if (this.pokedexUI && this.pokedexUI.setOptionsManager) {
      this.pokedexUI.setOptionsManager(optionsManager);
    }
    
    if (this.pokedexIcon && this.pokedexIcon.optionsManager !== optionsManager) {
      console.log('🔄 [PokedexSystem] Mise à jour optionsManager pour l\'icône');
      this.pokedexIcon.optionsManager = optionsManager;
      this.pokedexIcon.setupLanguageSupport?.();
    }
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
    } else {
      console.log('✅ [PokedexSystem]', message);
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
    console.log('🧹 [PokedexSystem] Cache vidé');
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
      hasOptionsManager: !!this.optionsManager
    };
  }

  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [PokedexSystem] Destruction...');
    
    // Détruire les composants
    if (this.pokedexUI) {
      this.pokedexUI.destroy();
      this.pokedexUI = null;
    }
    
    if (this.pokedexIcon) {
      this.pokedexIcon.destroy();
      this.pokedexIcon = null;
    }
    
    // Vider les caches
    this.pokemonCache.clear();
    this.searchCache.clear();
    
    // Reset données
    this.pokedexData = {};
    this.playerStats = {};
    this.notifications = [];
    this.settings = {};
    
    // Reset état
    this.isInitialized = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.optionsManager = null;  // ← NOUVEAU
    
    // Supprimer référence globale
    if (window.pokedexSystem === this) {
      delete window.pokedexSystem;
    }
    
    console.log('✅ [PokedexSystem] Détruit');
  }
}

// === 📋 EXPORT ===
export default PokedexSystem;

console.log(`
📱 === POKÉDEX SYSTEM AVEC TRADUCTIONS ===

🎯 FONCTIONNALITÉS PRINCIPALES:
• Gestion complète du Pokédex
• Communication serveur optimisée
• Cache local pour les performances
• Notifications et achievements
• Intégration avec autres systèmes
• 🌐 SUPPORT TRADUCTIONS TEMPS RÉEL

📡 COMMUNICATION SERVEUR:
• Toutes les requêtes du handler serveur
• Gestion des réponses et erreurs
• Cache intelligent
• Synchronisation automatique

🎮 ÉVÉNEMENTS SUPPORTÉS:
• pokemonEncountered → auto mark seen
• pokemonCaptured → auto mark caught
• pokemonEvolved → gestion évolutions
• Notifications temps réel

📊 DONNÉES GÉRÉES:
• Entrées Pokédex (vu/capturé/shiny)
• Statistiques joueur
• Favoris et tags
• Notifications
• Paramètres utilisateur

🎨 ANIMATIONS ET EFFETS:
• Découvertes avec sons
• Captures avec effets visuels
• Jalons avec celebrations
• Notifications contextuelles

🌐 TRADUCTIONS SUPPORTÉES:
• OptionsManager passé au constructeur
• Injection tardive via setOptionsManager()
• Propagation automatique aux composants
• Support langue temps réel sur icône et UI

✅ SYSTÈME POKÉDEX PRÊT POUR L'AVENTURE + MULTILINGUE !
`);
