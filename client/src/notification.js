// client/src/notification.js - Centralized notification logic

import { NotificationManager } from './components/NotificationManager.js';

/**
 * Central notification system for the Pokémon game
 * Handles all notifications, preferences, and integrations
 */
export class GameNotificationSystem {
  constructor() {
    this.notificationManager = null;
    this.isInitialized = false;
    this.preferences = this.getDefaultPreferences();
    
    console.log("🔔 GameNotificationSystem created");
  }

  /**
   * Initialize the notification system
   */
  init() {
    if (this.isInitialized) {
      console.warn("⚠️ GameNotificationSystem already initialized");
      return this.notificationManager;
    }

    console.log("🔔 Initializing notification system...");
    
    // Create NotificationManager
    this.notificationManager = new NotificationManager();
    
    // Load user preferences
    this.loadPreferences();
    
    // Apply NotificationManager config
    this.applyPreferences();
    
    // Expose globally
    window.NotificationManager = this.notificationManager;
    
    // Mark as initialized
    this.isInitialized = true;
    
    // Welcome notification
    this.showWelcomeNotification();
    
    console.log("✅ Notification system initialized and globally available");
    return this.notificationManager;
  }

  /**
   * Default preferences
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
   * Apply preferences to NotificationManager
   */
  applyPreferences() {
    if (!this.notificationManager) return;
    
    this.notificationManager.setDefaultPosition(this.preferences.defaultPosition);
    this.notificationManager.setDefaultDuration(this.preferences.defaultDuration);
    this.notificationManager.maxNotifications = this.preferences.maxNotifications;
    
    console.log("🔧 Preferences applied:", this.preferences);
  }

  /**
   * Show welcome notification
   */
  showWelcomeNotification() {
    if (window.username && this.notificationManager) {
      this.notificationManager.success(
        `Welcome ${window.username}!`,
        {
          duration: 4000,
          bounce: true,
          position: 'top-center'
        }
      );
    }
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      localStorage.setItem('pokegame_notification_preferences', JSON.stringify(this.preferences));
      
      if (this.notificationManager) {
        this.notificationManager.info(
          "Preferences saved",
          { duration: 2000 }
        );
      }
      
      console.log("💾 Notification preferences saved:", this.preferences);
    } catch (error) {
      console.error("❌ Error saving preferences:", error);
    }
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem('pokegame_notification_preferences');
      if (saved) {
        const loadedPreferences = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...loadedPreferences };
        console.log("📂 Notification preferences loaded:", this.preferences);
        return true;
      }
    } catch (error) {
      console.warn("⚠️ Error loading notification preferences:", error);
    }
    return false;
  }

  /**
   * Configure preferences
   */
  configure(newPreferences = {}) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.applyPreferences();
    
    if (this.notificationManager) {
      this.notificationManager.success(
        "Notifications configured!",
        {
          duration: 2000,
          position: this.preferences.defaultPosition
        }
      );
    }
    
    console.log("🔔 Notification configuration applied:", this.preferences);
  }

  // === SPECIALIZED NOTIFICATION METHODS ===

  /**
   * Notification: Entered a zone
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
   * Notification: NPC interaction
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
   * Player action notifications
   */
  onPlayerAction(action, details = {}) {
    if (!this.preferences.enableGameEvents || !this.notificationManager) return;
    
    let message = `Action: ${action}`;
    let type = 'info';
    let options = { duration: 2000 };
    
    switch (action) {
      case 'levelUp':
        message = `Level ${details.level} reached!`;
        type = 'success';
        options.bounce = true;
        options.duration = 4000;
        break;
        
      case 'pokemonCaught':
        message = `${details.pokemonName} caught!`;
        type = 'success';
        options.bounce = true;
        options.duration = 3000;
        break;
        
      case 'battleWon':
        message = "Battle won!";
        type = 'success';
        options.duration = 3000;
        break;
        
      case 'battleLost':
        message = "Battle lost...";
        type = 'warning';
        options.duration = 3000;
        break;
        
      case 'questCompleted':
        // ✅ FIX: DO NOT show notification here, handled by QuestSystem
        console.log("🔕 questCompleted notification ignored (handled by QuestSystem)");
        return;
        
      case 'questStarted':
        // ✅ FIX: DO NOT show notification here, handled by QuestSystem
        console.log("🔕 questStarted notification ignored (handled by QuestSystem)");
        return;
        
      case 'error':
        message = details.message || "An error has occurred";
        type = 'error';
        options.duration = 4000;
        break;
        
      default:
        message = `${action}: ${details.message || ''}`;
    }
    
    this.notificationManager.show(message, { type, ...options });
  }

  /**
   * Notification: System initialized
   */
  onSystemInitialized(systemName) {
    if (!this.notificationManager) return;
    
    const messages = {
      'inventory': 'Inventory system initialized',
      'quests': 'Quest system initialized',
      'starter': 'Starter selection ready',
      'all': 'All systems are ready!'
    };
    
    const message = messages[systemName] || `System ${systemName} initialized`;
    const position = systemName === 'all' ? 'top-center' : 'bottom-right';
    const bounce = systemName === 'all';
    
    this.notificationManager.info(message, {
      duration: systemName === 'all' ? 3000 : 2000,
      position: position,
      bounce: bounce
    });
  }

  // === PUBLIC METHODS FOR DEVELOPERS ===

  /**
   * Show a custom notification
   */
  show(message, type = 'info', options = {}) {
    if (this.notificationManager) {
      return this.notificationManager.show(message, { type, ...options });
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Show an important alert
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
   * Show an achievement
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

  // === TEST METHODS ===

  /**
   * Test all notification types
   */
  testAllTypes() {
    if (!this.notificationManager) {
      console.warn("⚠️ NotificationManager not initialized");
      return;
    }

    const tests = [
      () => this.notificationManager.info("Test Info", { position: 'top-right' }),
      () => this.notificationManager.success("Test Success", { position: 'top-center' }),
      () => this.notificationManager.warning("Test Warning", { position: 'top-left' }),
      () => this.notificationManager.error("Test Error", { position: 'bottom-left' }),
      () => this.notificationManager.quest("Test Quest", { position: 'bottom-center', bounce: true }),
      () => this.notificationManager.inventory("Test Inventory", { position: 'bottom-right' }),
      () => this.notificationManager.achievement("Test Achievement!", { bounce: true, sound: true })
    ];
    
    tests.forEach((test, index) => {
      setTimeout(test, index * 800);
    });
  }

  /**
   * Test basic notifications
   */
  testBasic() {
    if (!this.notificationManager) return;
    
    this.notificationManager.info("Test info notification", { duration: 2000 });
    
    setTimeout(() => {
      this.notificationManager.success("Test success notification", { duration: 2000 });
    }, 500);
    
    setTimeout(() => {
      this.notificationManager.warning("Test warning notification", { duration: 2000 });
    }, 1000);
    
    setTimeout(() => {
      this.notificationManager.error("Test error notification", { duration: 2000 });
    }, 1500);
  }

  /**
   * Test quest notification
   */
  testQuest() {
    if (!this.notificationManager) return;
    
    this.notificationManager.questNotification(
      "Quest Test",
      "started",
      {
        duration: 4000,
        bounce: true,
        onClick: () => {
          this.notificationManager.info("Quest journal clicked!", { duration: 2000 });
        }
      }
    );
  }

  /**
   * Test inventory notification
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
          this.notificationManager.info("Inventory clicked!", { duration: 2000 });
        }
      }
    );
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    if (this.notificationManager) {
      this.notificationManager.clear();
      console.log("🧹 All notifications cleared");
    }
  }

  // === GETTERS ===

  /**
   * Get NotificationManager
   */
  getManager() {
    return this.notificationManager;
  }

  /**
   * Check if the system is initialized
   */
  isReady() {
    return this.isInitialized && this.notificationManager !== null;
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Get system status
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

// === UTILITY FUNCTIONS FOR INTEGRATION ===

/**
 * Create and initialize the global notification system
 */
export function initializeGameNotifications() {
  if (window.gameNotificationSystem) {
    console.warn("⚠️ Notification system already initialized");
    return window.gameNotificationSystem;
  }
  
  console.log("🔔 Creating global notification system...");
  
  const system = new GameNotificationSystem();
  system.init();
  
  // Make globally accessible
  window.gameNotificationSystem = system;
  
  // Setup global convenience functions
  setupGlobalNotificationFunctions(system);
  
  console.log("✅ Global notification system ready");
  return system;
}

/**
 * Setup global notification functions
 */
function setupGlobalNotificationFunctions(system) {
  // Basic functions
  window.showGameNotification = (message, type, options) => system.show(message, type, options);
  window.showGameAlert = (message, options) => system.showAlert(message, options);
  window.showGameAchievement = (message, options) => system.showAchievement(message, options);
  
  // Test functions
  window.testNotifications = () => system.testBasic();
  window.testAllNotifications = () => system.testAllTypes();
  window.testQuestNotification = () => system.testQuest();
  window.testItemNotification = () => system.testInventory();
  
  // Configuration functions
  window.configureNotifications = (config) => system.configure(config);
  window.saveNotificationPreferences = () => system.savePreferences();
  window.loadNotificationPreferences = () => system.loadPreferences();
  window.clearAllNotifications = () => system.clearAll();
  
  // Game event functions
  window.onZoneEntered = (zoneName) => system.onZoneEntered(zoneName);
  window.onNpcInteraction = (npcName, type) => system.onNpcInteraction(npcName, type);
  window.onPlayerAction = (action, details) => system.onPlayerAction(action, details);
  window.onSystemInitialized = (systemName) => system.onSystemInitialized(systemName);
  
  // ✅ NEW: Quest deduplication helpers
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
  
  // Debug function
  window.debugNotificationSystem = () => {
    const status = system.getStatus();
    console.log("🔍 Notification system status:", status);
    
    if (system.notificationManager) {
      system.show(
        `Debug: System is ${status.initialized ? 'ready' : 'not ready'}`,
        'info',
        { duration: 3000, position: 'top-left' }
      );
    }
    
    return status;
  };
  
  // Change default position
  window.setNotificationPosition = (position) => {
    system.configure({ defaultPosition: position });
  };
  
  console.log("🔗 Global notification functions configured");
}

/**
 * Developer instructions
 */
export function showNotificationInstructions() {
  console.log(`
🔔 === NOTIFICATION SYSTEM READY ===
Available functions:

=== Tests ===
• window.testNotifications() - Basic tests
• window.testAllNotifications() - Full test with positions
• window.testQuestNotification() - Quest notification test
• window.testItemNotification() - Inventory notification test
• window.clearAllNotifications() - Clear all

=== Configuration ===
• window.configureNotifications(config) - Configure preferences
• window.saveNotificationPreferences() - Save
• window.loadNotificationPreferences() - Load
• window.setNotificationPosition(position) - Change position

=== Notifications ===
• window.showGameNotification(msg, type, options) - Custom notification
• window.showGameAlert(msg, options) - Important alert
• window.showGameAchievement(msg, options) - Achievement

=== Game Events ===
• window.onZoneEntered(zoneName) - Zone entry
• window.onNpcInteraction(npcName, type) - NPC interaction
• window.onPlayerAction(action, details) - Player action
• window.onSystemInitialized(systemName) - System initialized

=== ✅ NEW: Quest deduplication ===
• window.resetQuestNotificationCooldowns() - Reset cooldowns
• window.debugQuestNotifications() - Quest notification debug
• window.setQuestNotificationCooldown(ms) - Change delay (default: 2000ms)

=== Debug ===
• window.debugNotificationSystem() - Notification system debug
• window.debugQuestNotifications() - Quest-specific debug

=== Available positions ===
top-right, top-left, top-center, bottom-right, bottom-left, bottom-center

=== Available types ===
info, success, error, warning, quest, inventory, achievement

=== ✅ DOUBLE NOTIFICATION ISSUE RESOLVED ===
The deduplication system now prevents duplicate notifications.
If you still have duplicates, use:
• window.resetQuestNotificationCooldowns() - to reset
• window.setQuestNotificationCooldown(5000) - to increase the delay
=========================================
  `);
}
