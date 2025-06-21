// client/src/debug-notifications.js - Outil de debug pour tracer les sources de notifications

/**
 * Active le mode debug pour tracer l'origine des notifications
 */
export function enableNotificationDebug() {
  console.log("🔍 Activation du mode debug des notifications");

  // Hook sur le NotificationManager global
  if (window.NotificationManager) {
    const originalShow = window.NotificationManager.show.bind(window.NotificationManager);
    const originalQuestNotification = window.NotificationManager.questNotification.bind(window.NotificationManager);

    // Override de la méthode show
    window.NotificationManager.show = function(message, options = {}) {
      const stack = new Error().stack;
      console.log("📢 NOTIFICATION SHOW appelée:");
      console.log("  Message:", message);
      console.log("  Options:", options);
      console.log("  Source:", getCallerInfo(stack));
      console.log("  Stack complet:", stack);
      console.log("─────────────────────────────────");
      
      return originalShow(message, options);
    };

    // Override de la méthode questNotification
    window.NotificationManager.questNotification = function(questName, action, options = {}) {
      const stack = new Error().stack;
      console.log("🎯 QUEST NOTIFICATION appelée:");
      console.log("  Quête:", questName);
      console.log("  Action:", action);
      console.log("  Options:", options);
      console.log("  Source:", getCallerInfo(stack));
      console.log("  Stack complet:", stack);
      console.log("─────────────────────────────────");
      
      return originalQuestNotification(questName, action, options);
    };

    // Override des méthodes spécialisées
    const methods = ['success', 'error', 'warning', 'info', 'quest', 'inventory', 'achievement'];
    methods.forEach(method => {
      if (window.NotificationManager[method]) {
        const original = window.NotificationManager[method].bind(window.NotificationManager);
        window.NotificationManager[method] = function(message, options = {}) {
          const stack = new Error().stack;
          console.log(`📢 NOTIFICATION ${method.toUpperCase()} appelée:`);
          console.log("  Message:", message);
          console.log("  Source:", getCallerInfo(stack));
          console.log("─────────────────────────────────");
          
          return original(message, options);
        };
      }
    });

    console.log("✅ Hook de debug installé sur NotificationManager");
  }

  // Hook sur les fonctions globales
  if (window.showGameNotification) {
    const originalShowGame = window.showGameNotification;
    window.showGameNotification = function(message, type, options) {
      const stack = new Error().stack;
      console.log("🎮 SHOW GAME NOTIFICATION appelée:");
      console.log("  Message:", message);
      console.log("  Type:", type);
      console.log("  Source:", getCallerInfo(stack));
      console.log("─────────────────────────────────");
      
      return originalShowGame(message, type, options);
    };
  }

  if (window.onSystemInitialized) {
    const originalOnSystem = window.onSystemInitialized;
    window.onSystemInitialized = function(systemName) {
      const stack = new Error().stack;
      console.log("🔧 ON SYSTEM INITIALIZED appelée:");
      console.log("  Système:", systemName);
      console.log("  Source:", getCallerInfo(stack));
      console.log("─────────────────────────────────");
      
      return originalOnSystem(systemName);
    };
  }
}

/**
 * Désactive le mode debug
 */
export function disableNotificationDebug() {
  console.log("🔍 Désactivation du mode debug des notifications");
  // Il faudrait sauvegarder les méthodes originales pour les restaurer
  console.log("⚠️ Redémarrez la page pour désactiver complètement le debug");
}

/**
 * Extrait des informations sur l'appelant depuis la stack trace
 */
function getCallerInfo(stack) {
  const lines = stack.split('\n');
  
  // Ignorer les premières lignes (Error, getCallerInfo, la fonction hookée)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Éviter les lignes internes du navigateur
    if (line.includes('at ') && !line.includes('chrome-extension://') && !line.includes('extensions::')) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, file, lineNum, colNum] = match;
        const fileName = file.split('/').pop();
        return `${functionName} (${fileName}:${lineNum})`;
      }
      
      // Format alternatif
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (simpleMatch) {
        const [, file, lineNum] = simpleMatch;
        const fileName = file.split('/').pop();
        return `${fileName}:${lineNum}`;
      }
    }
  }
  
  return "Source inconnue";
}

/**
 * Affiche un résumé des notifications envoyées
 */
export function getNotificationSummary() {
  console.log("📊 Pour voir les notifications en détail, activez le debug avec:");
  console.log("enableNotificationDebug()");
  
  if (window.NotificationManager) {
    console.log("✅ NotificationManager disponible");
  } else {
    console.log("❌ NotificationManager non disponible");
  }
  
  if (window.questSystem) {
    console.log("✅ QuestSystem disponible");
    if (window.questSystem.debugNotificationSystem) {
      window.questSystem.debugNotificationSystem();
    }
  } else {
    console.log("❌ QuestSystem non disponible");
  }
}

/**
 * Test pour identifier les sources de doublons
 */
export function testQuestNotificationSources() {
  console.log("🧪 Test des sources de notification de quête...");
  
  // Activer le debug
  enableNotificationDebug();
  
  // Simuler une acceptation de quête
  setTimeout(() => {
    console.log("🎯 Simulation d'acceptation de quête...");
    
    if (window.questSystem && window.questSystem.notificationManager) {
      window.questSystem.notificationManager.questNotification(
        "Quête Test",
        "started",
        { duration: 2000 }
      );
    }
    
    setTimeout(() => {
      if (window.onSystemInitialized) {
        window.onSystemInitialized('quests');
      }
    }, 100);
    
  }, 1000);
}

// Fonctions globales pour la console
window.enableNotificationDebug = enableNotificationDebug;
window.disableNotificationDebug = disableNotificationDebug;
window.getNotificationSummary = getNotificationSummary;
window.testQuestNotificationSources = testQuestNotificationSources;

console.log(`
🔍 === DEBUG NOTIFICATIONS DISPONIBLE ===
Fonctions ajoutées à window:
• enableNotificationDebug() - Active le trace des notifications
• disableNotificationDebug() - Désactive le debug
• getNotificationSummary() - Résumé de l'état
• testQuestNotificationSources() - Test les sources de doublons

Utilisez enableNotificationDebug() puis acceptez une quête
pour voir exactement d'où viennent les notifications!
==========================================
`);
