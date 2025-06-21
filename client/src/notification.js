// client/src/notification.js - Logique de notification centralisée

import { NotificationManager } from './components/NotificationManager.js';

/**
 * Système de notification centralisé pour le jeu Pokémon
 * Gère toutes les notifications, préférences et intégrations
 */
export class GameNotificationSystem {
  constructor() {
    this.notificationManager = null;
    this.isInitialized = false;
    this.preferences = this.getDefaultPreferences();
    
    console.log("🔔 GameNotificationSystem créé");
  }

  /**
   * Initialise le système de notification
   */
  init() {
    if (this.isInitialized) {
      console.warn("⚠️ GameNotificationSystem déjà initialisé");
      return this.notificationManager;
    }

    console.log("🔔 Initialisation du système de notification...");
    
    // Créer le NotificationManager
    this.notificationManager = new NotificationManager();
    
    // Charger les préférences utilisateur
    this.loadPreferences();
    
    // Configurer le NotificationManager
    this.applyPreferences();
    
    // Rendre accessible globalement
    window.NotificationManager = this.notificationManager;
    
    // Marquer comme initialisé
    this.isInitialized = true;
    
    // Notification de bienvenue
    this.showWelcomeNotification();
    
    console.log("✅ Système de notification initialisé et disponible globalement");
    return this.notificationManager;
  }

  /**
   * Préférences par défaut
   */
  getDefaultPreferences() {
    return {
      defaultPosition: 'top-right',
      defaultDuration: 4000,
      enableSounds: true,
      enableAnimations: true,
      maxNotifications: 5,
      enableGameEvents: true,
      enableQuestNotifications: true,
      enableInventoryNotifications: true
    };
  }

  /**
   * Applique les préférences au NotificationManager
   */
  applyPreferences() {
    if (!this.notificationManager) return;
    
    this.notificationManager.setDefaultPosition(this.preferences.defaultPosition);
    this.notificationManager.setDefaultDuration(this.preferences.defaultDuration);
    this.notificationManager.maxNotifications = this.preferences.maxNotifications;
    
    console.log("🔧 Préférences appliquées:", this.preferences);
  }

  /**
   * Affiche une notification de bienvenue
   */
  showWelcomeNotification() {
    if (window.username && this.notificationManager) {
      this.notificationManager.success(
        `Bienvenue ${window.username} !`,
        {
          duration: 4000,
          bounce: true,
          position: 'top-center'
        }
      );
    }
  }

  /**
   * Sauvegarde les préférences dans localStorage
   */
  savePreferences() {
    try {
      localStorage.setItem('pokegame_notification_preferences', JSON.stringify(this.preferences));
      
      if (this.notificationManager) {
        this.notificationManager.info(
          "Préférences sauvegardées",
          { duration: 2000 }
        );
      }
      
      console.log("💾 Préférences de notification sauvegardées:", this.preferences);
    } catch (error) {
      console.error("❌ Erreur sauvegarde préférences:", error);
    }
  }

  /**
   * Charge les préférences depuis localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem('pokegame_notification_preferences');
      if (saved) {
        const loadedPreferences = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...loadedPreferences };
        console.log("📂 Préférences de notification chargées:", this.preferences);
        return true;
      }
    } catch (error) {
      console.warn("⚠️ Erreur chargement préférences notifications:", error);
    }
    return false;
  }

  /**
   * Configure les préférences
   */
  configure(newPreferences = {}) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.applyPreferences();
    
    if (this.notificationManager) {
      this.notificationManager.success(
        "Notifications configurées !",
        {
          duration: 2000,
          position: this.preferences.defaultPosition
        }
      );
    }
    
    console.log("🔔 Configuration des notifications appliquée:", this.preferences);
  }

  // === MÉTHODES DE NOTIFICATION SPÉCIALISÉES ===

  /**
   * Notification de connexion à une zone
   */
  onZoneEntered(zoneName) {
    if (!this.preferences.enableGameEvents || !this.notificationManager) return;
    
    this.notificationManager.info(
      `Zone: ${zoneName}`,
      {
        duration: 3000,
        position: 'top-center'
      }
    );
  }

  /**
   * Notification d'interaction NPC
   */
  onNpcInteraction(npcName, interactionType) {
    if (!this.preferences.enableGameEvents || !this.notificationManager) return;
    
    if (interactionType !== 'dialogue') {
      this.notificationManager.info(
        `Interaction: ${npcName}`,
        {
          duration: 2000,
          position: 'bottom-center'
        }
      );
    }
  }

  /**
   * Notifications d'actions du joueur
   */
  onPlayerAction(action, details = {}) {
    if (!this.preferences.enableGameEvents || !this.notificationManager) return;
    
    let message = `Action: ${action}`;
    let type = 'info';
    let options = { duration: 2000 };
    
    switch (action) {
      case 'levelUp':
        message = `Niveau ${details.level} atteint !`;
        type = 'success';
        options.bounce = true;
        options.duration = 4000;
        break;
        
      case 'pokemonCaught':
        message = `${details.pokemonName} capturé !`;
        type = 'success';
        options.bounce = true;
        options.duration = 3000;
        break;
        
      case 'battleWon':
        message = "Combat gagné !";
        type = 'success';
        options.duration = 3000;
        break;
        
      case 'battleLost':
        message = "Combat perdu...";
        type = 'warning';
        options.duration = 3000;
        break;
        
      case 'questCompleted':
        // ✅ FIX: NE PAS montrer de notification ici, c'est géré par QuestSystem
        console.log("🔕 Notification questCompleted ignorée (gérée par QuestSystem)");
        return;
        
      case 'questStarted':
        // ✅ FIX: NE PAS montrer de notification ici, c'est géré par QuestSystem
        console.log("🔕 Notification questStarted ignorée (gérée par QuestSystem)");
        return;
        
      case 'error':
        message = details.message || "Une erreur est survenue";
        type = 'error';
        options.duration = 4000;
        break;
        
      default:
        message = `${action}: ${details.message || ''}`;
    }
    
    this.notificationManager.show(message, { type, ...options });
  }

  /**
   * Notification de système initialisé
   */
  onSystemInitialized(systemName) {
    if (!this.notificationManager) return;
    
    const messages = {
      'inventory': 'Système d\'inventaire initialisé',
      'quests': 'Système de quêtes initialisé',
      'starter': 'Sélection de starter prête',
      'all': 'Tous les systèmes sont prêts !'
    };
    
    const message = messages[systemName] || `Système ${systemName} initialisé`;
    const position = systemName === 'all' ? 'top-center' : 'bottom-right';
    const bounce = systemName === 'all';
    
    this.notificationManager.info(message, {
      duration: systemName === 'all' ? 3000 : 2000,
      position: position,
      bounce: bounce
    });
  }

  // === MÉTHODES PUBLIQUES POUR LES DÉVELOPPEURS ===

  /**
   * Affiche une notification personnalisée
   */
  show(message, type = 'info', options = {}) {
    if (this.notificationManager) {
      return this.notificationManager.show(message, { type, ...options });
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Affiche une alerte importante
   */
  showAlert(message, options = {}) {
    if (this.notificationManager) {
      return this.notificationManager.warning(message, {
        duration: 5000,
        position: 'top-center',
        closable: true,
        ...options
      });
    } else {
      alert(message);
    }
  }

  /**
   * Affiche un achievement
   */
  showAchievement(achievement, options = {}) {
    if (this.notificationManager) {
      return this.notificationManager.achievement(achievement, {
        duration: 6000,
        bounce: true,
        sound: true,
        position: 'top-center',
        ...options
      });
    } else {
      console.log(`🏆 ACHIEVEMENT: ${achievement}`);
    }
  }

  // === MÉTHODES DE TEST ===

  /**
   * Teste tous les types de notifications
   */
  testAllTypes() {
    if (!this.notificationManager) {
      console.warn("⚠️ NotificationManager non initialisé");
      return;
    }

    const tests = [
      () => this.notificationManager.info("Test Info", { position: 'top-right' }),
      () => this.notificationManager.success("Test Succès", { position: 'top-center' }),
      () => this.notificationManager.warning("Test Avertissement", { position: 'top-left' }),
      () => this.notificationManager.error("Test Erreur", { position: 'bottom-left' }),
      () => this.notificationManager.quest("Test Quête", { position: 'bottom-center', bounce: true }),
      () => this.notificationManager.inventory("Test Inventaire", { position: 'bottom-right' }),
      () => this.notificationManager.achievement("Test Achievement !", { bounce: true, sound: true })
    ];
    
    tests.forEach((test, index) => {
      setTimeout(test, index * 800);
    });
  }

  /**
   * Teste les notifications de base
   */
  testBasic() {
    if (!this.notificationManager) return;
    
    this.notificationManager.info("Test notification info", { duration: 2000 });
    
    setTimeout(() => {
      this.notificationManager.success("Test notification succès", { duration: 2000 });
    }, 500);
    
    setTimeout(() => {
      this.notificationManager.warning("Test notification avertissement", { duration: 2000 });
    }, 1000);
    
    setTimeout(() => {
      this.notificationManager.error("Test notification erreur", { duration: 2000 });
    }, 1500);
  }

  /**
   * Teste une notification de quête
   */
  testQuest() {
    if (!this.notificationManager) return;
    
    this.notificationManager.questNotification(
      "Quête Test",
      "started",
      {
        duration: 4000,
        bounce: true,
        onClick: () => {
          this.notificationManager.info("Journal des quêtes cliqué !", { duration: 2000 });
        }
      }
    );
  }

  /**
   * Teste une notification d'inventaire
   */
  testInventory() {
    if (!this.notificationManager) return;
    
    this.notificationManager.itemNotification(
      "Poké Ball",
      5,
      "obtained",
      {
        duration: 3000,
        onClick: () => {
          this.notificationManager.info("Inventaire cliqué !", { duration: 2000 });
        }
      }
    );
  }

  /**
   * Efface toutes les notifications
   */
  clearAll() {
    if (this.notificationManager) {
      this.notificationManager.clear();
      console.log("🧹 Toutes les notifications supprimées");
    }
  }

  // === GETTERS ===

  /**
   * Retourne le NotificationManager
   */
  getManager() {
    return this.notificationManager;
  }

  /**
   * Vérifie si le système est initialisé
   */
  isReady() {
    return this.isInitialized && this.notificationManager !== null;
  }

  /**
   * Retourne les préférences actuelles
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Retourne le statut du système
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      managerReady: !!this.notificationManager,
      preferences: this.preferences,
      globallyAvailable: !!window.NotificationManager
    };
  }
}

// === FONCTIONS UTILITAIRES POUR L'INTÉGRATION ===

/**
 * Crée et initialise le système de notification global
 */
export function initializeGameNotifications() {
  if (window.gameNotificationSystem) {
    console.warn("⚠️ Système de notification déjà initialisé");
    return window.gameNotificationSystem;
  }
  
  console.log("🔔 Création du système de notification global...");
  
  const system = new GameNotificationSystem();
  system.init();
  
  // Rendre accessible globalement
  window.gameNotificationSystem = system;
  
  // Créer les fonctions globales de convenance
  setupGlobalNotificationFunctions(system);
  
  console.log("✅ Système de notification global prêt");
  return system;
}

/**
 * Configure les fonctions globales de notification
 */
function setupGlobalNotificationFunctions(system) {
  // Fonctions de base
  window.showGameNotification = (message, type, options) => system.show(message, type, options);
  window.showGameAlert = (message, options) => system.showAlert(message, options);
  window.showGameAchievement = (message, options) => system.showAchievement(message, options);
  
  // Fonctions de test
  window.testNotifications = () => system.testBasic();
  window.testAllNotifications = () => system.testAllTypes();
  window.testQuestNotification = () => system.testQuest();
  window.testItemNotification = () => system.testInventory();
  
  // Fonctions de configuration
  window.configureNotifications = (config) => system.configure(config);
  window.saveNotificationPreferences = () => system.savePreferences();
  window.loadNotificationPreferences = () => system.loadPreferences();
  window.clearAllNotifications = () => system.clearAll();
  
  // Fonctions d'événements de jeu
  window.onZoneEntered = (zoneName) => system.onZoneEntered(zoneName);
  window.onNpcInteraction = (npcName, type) => system.onNpcInteraction(npcName, type);
  window.onPlayerAction = (action, details) => system.onPlayerAction(action, details);
  window.onSystemInitialized = (systemName) => system.onSystemInitialized(systemName);
  
  // ✅ NOUVELLES FONCTIONS pour gérer la déduplication des quêtes
  window.resetQuestNotificationCooldowns = () => {
    if (window.questSystem && typeof window.questSystem.resetNotificationCooldowns === 'function') {
      window.questSystem.resetNotificationCooldowns();
    }
  };
  
  window.debugQuestNotifications = () => {
    if (window.questSystem && typeof window.questSystem.debugNotificationSystem === 'function') {
      window.questSystem.debugNotificationSystem();
    }
  };
  
  window.setQuestNotificationCooldown = (milliseconds) => {
    if (window.questSystem && typeof window.questSystem.setNotificationCooldown === 'function') {
      window.questSystem.setNotificationCooldown(milliseconds);
    }
  };
  
  // Fonction de debug
  window.debugNotificationSystem = () => {
    const status = system.getStatus();
    console.log("🔍 État du système de notification:", status);
    
    if (system.notificationManager) {
      system.show(
        `Debug: Système ${status.initialized ? 'prêt' : 'non prêt'}`,
        'info',
        { duration: 3000, position: 'top-left' }
      );
    }
    
    return status;
  };
  
  // Fonction pour changer la position par défaut
  window.setNotificationPosition = (position) => {
    system.configure({ defaultPosition: position });
  };
  
  console.log("🔗 Fonctions globales de notification configurées");
}

/**
 * Instructions pour les développeurs
 */
export function showNotificationInstructions() {
  console.log(`
🔔 === SYSTÈME DE NOTIFICATION PRÊT ===
Fonctions disponibles:

=== Tests ===
• window.testNotifications() - Tests de base
• window.testAllNotifications() - Test complet avec positions
• window.testQuestNotification() - Test notification de quête
• window.testItemNotification() - Test notification d'inventaire
• window.clearAllNotifications() - Nettoie tout

=== Configuration ===
• window.configureNotifications(config) - Configure les préférences
• window.saveNotificationPreferences() - Sauvegarde
• window.loadNotificationPreferences() - Chargement
• window.setNotificationPosition(position) - Change la position

=== Notifications ===
• window.showGameNotification(msg, type, options) - Notification personnalisée
• window.showGameAlert(msg, options) - Alerte importante
• window.showGameAchievement(msg, options) - Achievement

=== Événements de jeu ===
• window.onZoneEntered(zoneName) - Entrée dans une zone
• window.onNpcInteraction(npcName, type) - Interaction NPC
• window.onPlayerAction(action, details) - Action du joueur
• window.onSystemInitialized(systemName) - Système initialisé

=== ✅ NOUVEAU: Déduplication des quêtes ===
• window.resetQuestNotificationCooldowns() - Réinitialise les cooldowns
• window.debugQuestNotifications() - Debug du système de quêtes
• window.setQuestNotificationCooldown(ms) - Change le délai (défaut: 2000ms)

=== Debug ===
• window.debugNotificationSystem() - Debug du système
• window.debugQuestNotifications() - Debug spécifique aux quêtes

=== Positions disponibles ===
top-right, top-left, top-center, bottom-right, bottom-left, bottom-center

=== Types disponibles ===
info, success, error, warning, quest, inventory, achievement

=== ✅ RÉSOLUTION DU PROBLÈME DE DOUBLE NOTIFICATION ===
Le système de déduplication empêche maintenant les notifications en double.
Si vous avez encore des doublons, utilisez:
• window.resetQuestNotificationCooldowns() - pour réinitialiser
• window.setQuestNotificationCooldown(5000) - pour augmenter le délai
=========================================
  `);
}
