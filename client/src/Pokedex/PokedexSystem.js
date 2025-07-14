// PokedexSystem.js - SYSTÈME POKÉDX CORRIGÉ AVEC NOTIFICATION UI
// 🎮 Chef d'orchestre qui notifie l'UI

export class PokedexSystem {
  constructor(scene, gameRoom) {
    this.scene = scene;
    this.gameRoom = gameRoom;
    this.pokedxUI = null;
    this.pokedxIcon = null;
    this.pokedxData = {};
    this.playerProgress = {};
    this.isInitialized = false;
    
    console.log('🚀 [PokedexSystem] Initialisation système Pokédx...');
    this.init();
  }

  async init() {
    try {
      // Initialiser les composants
      await this.initializeUI();
      this.initializeIcon();
      
      // Configuration système
      this.setupKeyboardShortcuts();
      this.setupSystemIntegrations();
      this.setupInteractions();
      this.setupServerListeners();
      
      // Chargement données initial
      this.initializeDefaultData();
      
      this.isInitialized = true;
      console.log('✅ [PokedexSystem] Système Pokédx initialisé');
      
      // Demander les données du serveur
      this.requestPokedxData();
      
    } catch (error) {
      console.error('❌ [PokedexSystem] Erreur initialisation:', error);
    }
  }

  async initializeUI() {
    try {
      const { PokedexUI } = await import('./PokedexUI.js');
      this.pokedxUI = new PokedexUI(this.gameRoom);
      console.log('✅ [PokedexSystem] PokedexUI initialisé');
    } catch (error) {
      console.error('❌ [PokedexSystem] Erreur chargement PokedexUI:', error);
    }
  }

  initializeIcon() {
    try {
      // L'icône sera créée par le module parent
      console.log('✅ [PokedexSystem] Icône configurée');
    } catch (error) {
      console.error('❌ [PokedexSystem] Erreur icône:', error);
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Raccourci 'P' pour ouvrir/fermer
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Vérifier que ce n'est pas dans un input
        if (this.canPlayerInteract()) {
          e.preventDefault();
          this.toggle();
        }
      }
    });
    console.log('⌨️ [PokedexSystem] Raccourcis clavier configurés');
  }

  setupSystemIntegrations() {
    // Intégration avec d'autres systèmes du jeu
    console.log('🔗 [PokedexSystem] Intégrations système configurées');
  }

  setupInteractions() {
    // Interactions avec le monde du jeu
    console.log('🔗 [PokedexSystem] Interactions configurées');
  }

  // === 📡 LISTENERS SERVEUR - POINT CENTRAL ===
  
  setupServerListeners() {
    if (!this.gameRoom) return;

    // === DONNÉES PRINCIPALES (gérées par PokedexSystem) ===
    this.gameRoom.onMessage("pokedx:get", (response) => {
      console.log('📊 [PokedexSystem] Données Pokédx reçues:', response);
      this.handlePokedxData(response);
    });

    this.gameRoom.onMessage("pokedx:stats", (response) => {
      console.log('📈 [PokedexSystem] Stats reçues:', response);
      this.handleStatsData(response);
    });

    // === NOTIFICATIONS GLOBALES ===
    this.gameRoom.onMessage("pokedx:discovery", (data) => {
      console.log('✨ [PokedexSystem] Nouvelle découverte:', data);
      this.handleDiscoveryNotification(data);
    });

    this.gameRoom.onMessage("pokedx:capture", (data) => {
      console.log('🎯 [PokedexSystem] Nouvelle capture:', data);
      this.handleCaptureNotification(data);
    });

    this.gameRoom.onMessage("pokedx:streak_record", (data) => {
      console.log('🔥 [PokedexSystem] Nouveau record streak:', data);
      this.handleStreakRecord(data);
    });

    console.log('📡 [PokedexSystem] Listeners serveur configurés et corrigés');
  }

  // === 📊 GESTION DES DONNÉES REÇUES ===

  handlePokedxData(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur données Pokédx:', response.error);
      return;
    }

    console.log('📊 [PokedexSystem] Traitement données Pokédx...');
    
    // Stocker les données dans le système
    this.pokedxData = response.data;
    
    // Mettre à jour la progression
    if (response.data.summary) {
      this.playerProgress = {
        totalSeen: response.data.summary.totalSeen || 0,
        totalCaught: response.data.summary.totalCaught || 0,
        seenPercentage: response.data.summary.seenPercentage || 0,
        caughtPercentage: response.data.summary.caughtPercentage || 0,
        totalShiny: response.data.summary.shinies?.count || 0,
        lastActivity: new Date()
      };
      
      console.log(`📊 [PokedexSystem] Progression: ${this.playerProgress.totalCaught}/${response.data.summary.totalAvailable} (${Math.round(this.playerProgress.caughtPercentage)}%)`);
    }

    // 🆕 NOTIFIER L'UI SI ELLE EST OUVERTE
    if (this.pokedxUI && this.pokedxUI.isVisible) {
      console.log('📤 [PokedexSystem] Notification UI avec nouvelles données');
      this.pokedxUI.receiveDataFromSystem(response.data);
    }

    // Mettre à jour l'icône si disponible
    this.updateIconProgress();
  }

  handleStatsData(response) {
    if (!response.success) {
      console.error('❌ [PokedexSystem] Erreur stats:', response.error);
      return;
    }

    console.log('📈 [PokedexSystem] Traitement stats...');
    
    // Stocker les stats
    this.playerProgress = { ...this.playerProgress, ...response.data };

    // 🆕 NOTIFIER L'UI SI ELLE EST OUVERTE
    if (this.pokedxUI && this.pokedxUI.isVisible) {
      console.log('📤 [PokedexSystem] Notification UI avec nouvelles stats');
      this.pokedxUI.receiveStatsFromSystem(response.data);
    }

    this.updateIconProgress();
  }

  handleDiscoveryNotification(data) {
    console.log('✨ [PokedexSystem] Nouvelle découverte système:', data);
    
    // Traitement système global
    this.updateIconProgress();
    
    // Rafraîchir les données après découverte
    setTimeout(() => {
      this.requestPokedxData();
    }, 1000);
  }

  handleCaptureNotification(data) {
    console.log('🎯 [PokedexSystem] Nouvelle capture système:', data);
    
    // Traitement système global
    this.updateIconProgress();
    
    // Rafraîchir les données après capture
    setTimeout(() => {
      this.requestPokedxData();
    }, 1000);
  }

  handleStreakRecord(data) {
    console.log('🔥 [PokedexSystem] Record streak système:', data);
    
    // Traitement système des streaks
    this.updateIconProgress();
  }

  // === 📡 REQUÊTES AU SERVEUR ===

  requestPokedxData(filters = {}) {
    if (!this.gameRoom) {
      console.warn('⚠️ [PokedexSystem] GameRoom non disponible');
      return;
    }

    console.log('📡 [PokedexSystem] Demande données Pokédx...', filters);
    
    this.gameRoom.send("pokedx:get", {
      filters: {
        limit: 20,
        offset: 0,
        sortBy: 'id',
        sortOrder: 'asc',
        ...filters
      }
    });
  }

  requestStats() {
    if (!this.gameRoom) {
      console.warn('⚠️ [PokedexSystem] GameRoom non disponible');
      return;
    }

    console.log('📡 [PokedexSystem] Demande statistiques...');
    this.gameRoom.send("pokedx:stats");
  }

  // === 🎮 CONTRÔLES PUBLICS ===

  show() {
    if (!this.pokedxUI) {
      console.warn('⚠️ [PokedexSystem] PokedexUI non initialisé');
      return;
    }
    
    console.log('📱 [PokedexSystem] Ouverture Pokédx...');
    this.pokedxUI.show();
    
    // Demander une mise à jour des données à l'ouverture
    this.requestPokedxData();
  }

  hide() {
    if (!this.pokedxUI) return;
    
    console.log('❌ [PokedexSystem] Fermeture Pokédx...');
    this.pokedxUI.hide();
  }

  toggle() {
    if (!this.pokedxUI) {
      console.warn('⚠️ [PokedexSystem] PokedexUI non initialisé');
      return;
    }
    
    console.log('🔄 [PokedexSystem] Toggle Pokédx...');
    this.pokedxUI.toggle();
    
    // Si on ouvre, demander les données
    if (!this.pokedxUI.isVisible) {
      setTimeout(() => {
        if (this.pokedxUI.isVisible) {
          this.requestPokedxData();
        }
      }, 100);
    }
  }

  openToView(viewName) {
    if (!this.pokedxUI) return;
    
    console.log(`📱 [PokedexSystem] Ouverture vue ${viewName}...`);
    this.pokedxUI.openToView(viewName);
    
    // Demander les données appropriées selon la vue
    switch (viewName) {
      case 'stats':
        this.requestStats();
        break;
      default:
        this.requestPokedxData();
        break;
    }
  }

  // === 🎯 GESTION DES DONNÉES ===

  initializeDefaultData() {
    this.pokedxData = {
      entries: [],
      availablePokemon: [],
      summary: {
        totalAvailable: 0,
        totalSeen: 0,
        totalCaught: 0,
        seenPercentage: 0,
        caughtPercentage: 0
      }
    };
    
    this.playerProgress = {
      totalSeen: 0,
      totalCaught: 0,
      totalShiny: 0,
      seenPercentage: 0,
      caughtPercentage: 0,
      favoriteCount: 0,
      lastActivity: new Date()
    };
    
    console.log('📊 [PokedexSystem] Données par défaut initialisées');
  }

  updateIconProgress() {
    if (this.pokedxIcon && this.pokedxIcon.updateProgress) {
      this.pokedxIcon.updateProgress(this.playerProgress);
    }
  }

  // === 🔗 INTÉGRATION AVEC D'AUTRES SYSTÈMES ===

  markPokemonSeen(pokemonId, level, location, method = 'wild') {
    if (!this.gameRoom) return;

    console.log(`👁️ [PokedexSystem] Marquer #${pokemonId} comme vu...`);
    
    this.gameRoom.send("pokedx:mark_seen", {
      pokemonId,
      level,
      location,
      method
    });
  }

  markPokemonCaught(pokemonId, level, location, ownedPokemonId, isShiny = false) {
    if (!this.gameRoom) return;

    console.log(`🎯 [PokedexSystem] Marquer #${pokemonId} comme capturé...`);
    
    this.gameRoom.send("pokedx:mark_caught", {
      pokemonId,
      level,
      location,
      ownedPokemonId,
      isShiny,
      method: 'wild'
    });
  }

  // === 🛠️ UTILITAIRES ===

  canPlayerInteract() {
    // Vérifier que le joueur peut interagir (pas dans un menu, dialogue, etc.)
    const questDialogOpen = document.querySelector('.quest-dialog-overlay') !== null;
    const chatFocused = typeof window.isChatFocused === 'function' ? window.isChatFocused() : false;
    const starterHudOpen = typeof window.isStarterHUDOpen === 'function' ? window.isStarterHUDOpen() : false;
    const anyInputFocused = document.activeElement && 
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
    
    return !questDialogOpen && !chatFocused && !starterHudOpen && !anyInputFocused;
  }

  isOpen() {
    return this.pokedxUI?.isVisible || false;
  }

  getProgress() {
    return { ...this.playerProgress };
  }

  getPokedxData() {
    return { ...this.pokedxData };
  }

  // === 🎯 API POUR MODULES EXTERNES ===

  setIcon(iconInstance) {
    this.pokedxIcon = iconInstance;
    console.log('🔗 [PokedexSystem] Icône associée');
  }

  getUI() {
    return this.pokedxUI;
  }

  getIcon() {
    return this.pokedxIcon;
  }

  // === 🔄 SYNCHRONISATION ===

  forceSync() {
    console.log('🔄 [PokedexSystem] Synchronisation forcée...');
    
    if (this.gameRoom) {
      this.gameRoom.send("pokedx:quick_action", { action: "force_sync" });
    }
    
    // Recharger les données
    setTimeout(() => {
      this.requestPokedxData();
      this.requestStats();
    }, 1000);
  }

  // === 🧹 NETTOYAGE ===

  destroy() {
    console.log('🧹 [PokedexSystem] Destruction système...');
    
    // Nettoyer l'UI
    if (this.pokedxUI) {
      this.pokedxUI.destroy();
      this.pokedxUI = null;
    }
    
    // Nettoyer l'icône
    if (this.pokedxIcon) {
      this.pokedxIcon.destroy();
      this.pokedxIcon = null;
    }
    
    // Reset données
    this.pokedxData = {};
    this.playerProgress = {};
    this.isInitialized = false;
    
    console.log('✅ [PokedexSystem] Système détruit');
  }
}

// === 🌍 EXPORT GLOBAL ===
if (typeof window !== 'undefined') {
  window.PokedexSystem = PokedexSystem;
}
