// Pokedex/PokedexSystem.js - Système Pokédx avec traductions temps réel
// 🌐 Support optionsManager + logique métier complète

import { PokedexUI } from './PokedexUI.js';
import { PokedexIcon } from './PokedexIcon.js';

export class PokedexSystem {
  constructor(scene, gameRoom, optionsManager = null) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.optionsManager = optionsManager;  // ← NOUVEAU
    this.pokedxUI = null;
    this.pokedxIcon = null;
    
    // === DONNÉES POKÉDX ===
    this.pokedxData = {};      // Entrées du Pokédx
    this.playerStats = {};      // Statistiques du joueur
    this.notifications = [];    // Notifications Pokédx
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
    console.log('🚀 [PokedxSystem] Initialisation système Pokédx avec traductions...');
    
    // ✅ PASSER OPTIONSMANAGER AUX COMPOSANTS
    this.pokedxUI = new PokedexUI(this.gameRoom, this.optionsManager);
    this.pokedxIcon = new PokedexIcon(this.pokedxUI, this.optionsManager);
    
    // Configurer les interactions entre les composants
    this.setupInteractions();
    
    // Configurer les listeners serveur
    this.setupServerListeners();
    
    // Initialiser les données par défaut
    this.initializeDefaultData();
    
    // Rendre le système accessible globalement
    window.pokedxSystem = this;
    
    this.isInitialized = true;
    console.log('✅ [PokedxSystem] Système Pokédx initialisé avec traductions');
  }
  
  setupInteractions() {
    // Connecter icône → UI
    if (this.pokedxIcon) {
      this.pokedxIcon.onClick = () => {
        if (this.canPlayerInteract()) {
          this.pokedxUI.toggle();
        }
      };
    }
    
    // Configurer les raccourcis clavier
    this.setupKeyboardShortcuts();
    
    // Intégrer avec les autres systèmes
    this.setupSystemIntegration();
    
    console.log('🔗 [PokedxSystem] Interactions configurées');
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ne pas traiter les raccourcis si on ne peut pas interagir
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
    
    console.log('⌨️ [PokedxSystem] Raccourcis clavier configurés');
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
          this.pokedxIcon.setEnabled(false);
        });
        chatInput.addEventListener('blur', () => {
          this.pokedxIcon.setEnabled(true);
        });
      }
    }
    
    console.log('🔗 [PokedxSystem] Intégrations système configurées');
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
    
    console.log('📊 [PokedxSystem] Données par défaut initialisées');
  }

  // === 🔧 MÉTHODES INJECTION TARDIVE ===
  
  /**
   * Méthode pour injection tardive d'optionsManager
   */
  setOptionsManager(optionsManager) {
    console.log('🔧 [PokedxSystem] Injection tardive optionsManager...');
    
    this.optionsManager = optionsManager;
    
    // Passer aux composants existants
    if (this.pokedxUI) {
      this.pokedxUI.optionsManager = optionsManager;
      if (this.pokedxUI.setupLanguageSupport) {
        this.pokedxUI.setupLanguageSupport();
      }
    }
    
    if (this.pokedxIcon) {
      this.pokedxIcon.optionsManager = optionsManager;
      if (this.pokedxIcon.setupLanguageSupport) {
        this.pokedxIcon.setupLanguageSupport();
      }
    }
    
    console.log('✅ [PokedxSystem] OptionsManager injecté aux composants');
  }

  // === 📡 COMMUNICATION SERVEUR ===
  
setupServerListeners() {
  if (!this.gameRoom) return;

  // === RÉCEPTION DONNÉES POKÉDX ===
  // ✅ RETIRER ":response" de tous les listeners de réponse
  this.gameRoom.onMessage("pokedx:get", (response) => {
    this.handlePokedxDataResponse(response);
  });

  this.gameRoom.onMessage("pokedx:entry", (response) => {
    this.handlePokemonEntryResponse(response);
  });

  this.gameRoom.onMessage("pokedx:stats", (response) => {
    this.handleStatsResponse(response);
  });

  // === ÉVÉNEMENTS DE DÉCOUVERTE/CAPTURE ===
  // ✅ GARDER sans ":response" (ce sont des broadcasts)
  this.gameRoom.onMessage("pokedx:discovery", (data) => {
    this.handleDiscoveryEvent(data);
  });

  this.gameRoom.onMessage("pokedx:capture", (data) => {
    this.handleCaptureEvent(data);
  });

  // === RÉPONSES D'ACTIONS ===
  // ✅ RETIRER ":response"
  this.gameRoom.onMessage("pokedx:mark_seen", (response) => {
    this.handleMarkSeenResponse(response);
  });

  this.gameRoom.onMessage("pokedx:mark_caught", (response) => {
    this.handleMarkCaughtResponse(response);
  });

  this.gameRoom.onMessage("pokedx:toggle_favorite", (response) => {
    this.handleFavoriteResponse(response);
  });

  // === NOTIFICATIONS ===
  this.gameRoom.onMessage("pokedx:notifications", (response) => {
    this.handleNotificationsResponse(response);
  });

  // === SYNCHRONISATION ===
  this.gameRoom.onMessage("pokedx:quick_action", (response) => {
    this.handleQuickActionResponse(response);
  });

  console.log('📡 [PokedxSystem] Listeners serveur configurés et corrigés');
}

  // === 📤 REQUÊTES SERVEUR ===
  
requestPokedxData(filters = {}) {
  if (!this.gameRoom) return;
  
  // 🛠️ PROTECTION CONTRE LES DEMANDES MULTIPLES
  const now = Date.now();
  if (this._isRequestingData) {
    console.warn('⚠️ [PokedxSystem] Demande déjà en cours, ignorer');
    return;
  }
  
  if (this._lastRequestTime && (now - this._lastRequestTime) < this._requestCooldown) {
    console.warn('⚠️ [PokedxSystem] Cooldown actif, ignorer demande');
    return;
  }
  
  this._isRequestingData = true;
  this._lastRequestTime = now;
  
  console.log('📡 [PokedxSystem] Demande données Pokédx...', filters);
  this.gameRoom.send("pokedx:get", {
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
    
    console.log(`📡 [PokedxSystem] Demande entrée #${pokemonId}...`);
    this.gameRoom.send("pokedx:entry", {
      pokemonId: pokemonId,
      includeEvolutions: true,
      includeRecommendations: true
    });
  }
  
  requestPlayerStats() {
    if (!this.gameRoom) return;
    
    console.log('📡 [PokedxSystem] Demande statistiques...');
    this.gameRoom.send("pokedx:stats");
  }
  
  markPokemonSeen(pokemonId, level, location, options = {}) {
    if (!this.gameRoom) return;
    
    console.log(`👁️ [PokedxSystem] Marquer #${pokemonId} comme vu...`);
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
    
    console.log(`🎯 [PokedxSystem] Marquer #${pokemonId} comme capturé...`);
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
    
    console.log(`⭐ [PokedxSystem] Toggle favori #${pokemonId}...`);
    this.gameRoom.send("pokedx:toggle_favorite", {
      pokemonId: pokemonId
    });
  }
  
  searchPokemon(filters = {}) {
    if (!this.gameRoom) return;
    
    // Utiliser le cache pour les recherches rapides
    const cacheKey = JSON.stringify(filters);
    if (this.searchCache.has(cacheKey)) {
      console.log('💾 [PokedxSystem] Résultat de recherche depuis le cache');
      return this.searchCache.get(cacheKey);
    }
    
    console.log('🔍 [PokedxSystem] Recherche Pokémon...', filters);
    this.requestPokedxData(filters);
    
    return [];
  }
  
  syncPokedx() {
    if (!this.gameRoom || this.isSyncing) return;
    
    console.log('🔄 [PokedxSystem] Synchronisation Pokédx...');
    this.isSyncing = true;
    
    this.gameRoom.send("pokedx:quick_action", {
      action: "force_sync"
    });
  }
  
  markNotificationRead(notificationId) {
    if (!this.gameRoom) return;
    
    console.log(`📧 [PokedxSystem] Marquer notification lue: ${notificationId}`);
    this.gameRoom.send("pokedx:notification_read", {
      notificationId: notificationId
    });
  }
  
  markAllNotificationsRead() {
    if (!this.gameRoom) return;
    
    console.log('📧 [PokedxSystem] Marquer toutes notifications lues');
    this.gameRoom.send("pokedx:notification_read", {
      markAllRead: true
    });
  }

  // === 📥 TRAITEMENT RÉPONSES SERVEUR ===
  
  handlePokedxDataResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedxSystem] Erreur données Pokédx:', response.error);
      this.showError('Impossible de charger les données du Pokédx');
      return;
    }
    
    console.log('📊 [PokedxSystem] Données Pokédx reçues:', response.data);
    
    // Mettre à jour les données locales
    this.pokedxData = response.data.entries || [];
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
    
    console.log('✅ [PokedxSystem] Données Pokédx traitées');
  }
  
  handlePokemonEntryResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedxSystem] Erreur entrée Pokémon:', response.error);
      return;
    }
    
    console.log('📋 [PokedxSystem] Entrée Pokémon reçue:', response.data);
    
    // Mettre à jour le cache
    if (response.data.entry) {
      this.pokemonCache.set(response.data.entry.pokemonId, response.data.entry);
    }
  }
  
  handleStatsResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedxSystem] Erreur statistiques:', response.error);
      return;
    }
    
    console.log('📈 [PokedxSystem] Statistiques reçues:', response.data);
    
    // Mettre à jour les stats
    this.playerStats = { ...this.playerStats, ...response.data };
    this.updateIconProgress();
  }
  
  handleDiscoveryEvent(data) {
    console.log('✨ [PokedxSystem] Nouvelle découverte:', data);
    
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
    this.pokedxIcon?.animateNewDiscovery();
    this.pokedxIcon?.showDiscoveryNotification(data);
    
    // Son de découverte
    this.pokedxIcon?.playDiscoverySound();
    
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
    console.log('🎯 [PokedxSystem] Nouvelle capture:', data);
    
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
    this.pokedxIcon?.animateCapture();
    this.pokedxIcon?.showCaptureNotification(data);
    
    // Son de capture
    this.pokedxIcon?.playCaptureSound();
    
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
      console.error('❌ [PokedxSystem] Erreur marquer vu:', response.error);
      return;
    }
    
    console.log('✅ [PokedxSystem] Pokémon marqué comme vu:', response.data);
    
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
      console.error('❌ [PokedxSystem] Erreur marquer capturé:', response.error);
      return;
    }
    
    console.log('✅ [PokedxSystem] Pokémon marqué comme capturé:', response.data);
    
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
      console.error('❌ [PokedxSystem] Erreur favori:', response.error);
      return;
    }
    
    console.log('⭐ [PokedxSystem] Favori mis à jour:', response.data);
    
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
      console.error('❌ [PokedxSystem] Erreur notifications:', response.error);
      return;
    }
    
    console.log('📧 [PokedxSystem] Notifications reçues:', response.data);
    
    this.notifications = response.data.notifications || [];
    
    // Mettre à jour l'icône avec le nombre de notifications
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.pokedxIcon?.updateNotification(unreadCount > 0, unreadCount);
  }
  
  handleQuickActionResponse(response) {
    if (!response.success) {
      console.error('❌ [PokedxSystem] Erreur action rapide:', response.error);
      return;
    }
    
    console.log('⚡ [PokedxSystem] Action rapide:', response.data);
    
    if (response.data.action === 'force_sync') {
      this.isSyncing = false;
      this.lastSyncTime = new Date();
      
      // Recharger les données après sync
      setTimeout(() => {
        this.requestPokedxData();
        this.requestPlayerStats();
      }, 500);
    }
  }

  // === 📊 GESTION DES DONNÉES ===
  
  updateIconProgress() {
    if (!this.pokedxIcon) return;
    
    // Calculer les pourcentages
    const totalPokemon = 1025; // Total Pokémon national (à adapter selon votre jeu)
    const seenPercentage = Math.round((this.playerStats.totalSeen / totalPokemon) * 100);
    const caughtPercentage = Math.round((this.playerStats.totalCaught / totalPokemon) * 100);
    
    this.playerStats.seenPercentage = seenPercentage;
    this.playerStats.caughtPercentage = caughtPercentage;
    
    // Mettre à jour l'icône
    this.pokedxIcon.updateProgress({
      totalSeen: this.playerStats.totalSeen || 0,
      totalCaught: this.playerStats.totalCaught || 0,
      seenPercentage: seenPercentage,
      caughtPercentage: caughtPercentage
    });
    
    console.log(`📊 [PokedxSystem] Progression: ${this.playerStats.totalCaught}/${this.playerStats.totalSeen} (${caughtPercentage}%)`);
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
    console.log(`🏆 [PokedxSystem] Jalon atteint: ${percentage}%`);
    
    // Animation spéciale
    this.pokedxIcon?.animateMilestone(percentage);
    
    // Notification de jalon
    this.addNotification({
      type: 'milestone',
      message: `Pokédx ${percentage}% complété !`,
      timestamp: new Date(),
      priority: 'high',
      milestone: percentage
    });
    
    // Achievement
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(
        `🏆 Pokédx ${percentage}% complété !`,
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
    this.pokedxIcon?.updateNotification(unreadCount > 0, unreadCount);
    
    console.log('📧 [PokedxSystem] Notification ajoutée:', notification);
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
      console.error('❌ [PokedxSystem]', message);
    }
  }
  
  showSuccess(message) {
    if (typeof window.showGameNotification === 'function') {
      window.showGameNotification(message, 'success', { duration: 3000 });
    } else {
      console.log('✅ [PokedxSystem]', message);
    }
  }
  
  exportData() {
    return {
      playerStats: this.playerStats,
      settings: this.settings,
      lastSyncTime: this.lastSyncTime,
      cacheSize: this.pokemonCache.size,
      notificationCount: this.notifications.length,
      hasOptionsManager: !!this.optionsManager  // ← NOUVEAU
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
    console.log('🧹 [PokedxSystem] Cache vidé');
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
      hasOptionsManager: !!this.optionsManager,  // ← NOUVEAU
      i18nSupported: true                        // ← NOUVEAU
    };
  }

  // === 🧹 NETTOYAGE ===
  
  destroy() {
    console.log('🧹 [PokedxSystem] Destruction...');
    
    // Détruire les composants
    if (this.pokedxUI) {
      this.pokedxUI.destroy();
      this.pokedxUI = null;
    }
    
    if (this.pokedxIcon) {
      this.pokedxIcon.destroy();
      this.pokedxIcon = null;
    }
    
    // Vider les caches
    this.pokemonCache.clear();
    this.searchCache.clear();
    
    // Reset données
    this.pokedxData = {};
    this.playerStats = {};
    this.notifications = [];
    this.settings = {};
    
    // Reset état
    this.isInitialized = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.optionsManager = null;  // ← NOUVEAU
    
    // Supprimer référence globale
    if (window.pokedxSystem === this) {
      delete window.pokedxSystem;
    }
    
    console.log('✅ [PokedxSystem] Détruit avec nettoyage traductions');
  }
}

// === 📋 EXPORT ===
export default PokedxSystem;
