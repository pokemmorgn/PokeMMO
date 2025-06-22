import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { LoaderScene } from "./scenes/LoaderScene.js";
import { BeachScene } from "./scenes/zones/BeachScene.js";
import { VillageScene } from "./scenes/zones/VillageScene.js";
import { Road1Scene } from './scenes/zones/Road1Scene.js';
import { VillageLabScene } from './scenes/zones/VillageLabScene.js';
import { VillageHouse1Scene } from './scenes/zones/VillageHouse1Scene.js';
import { LavandiaScene } from './scenes/zones/LavandiaScene.js';

// === Colyseus.js ===
import { Client } from 'colyseus.js';

// === Import du chat séparé ===
import { initPokeChat } from './network/PokeChatSystem.js';

// === Import du HUD de sélection de starter ===
import { StarterSelectionHUD } from './components/StarterSelectionHUD.js';

// === Import du système de quêtes ===
import { QuestSystem } from './game/QuestSystem.js';

// === Import du système d'inventaire ===
import { InventorySystem } from './game/InventorySystem.js';

// === Import du système de notification centralisé ===
import { initializeGameNotifications, showNotificationInstructions } from './notification.js';

// === Import du debug de notifications ===
import './debug-notifications.js';

// --- Endpoint dynamique ---
const ENDPOINT =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.hostname +
  (location.port ? ":" + location.port : "") +
  "/ws";

// 1. Instancie un client Colyseus
const client = new Client(ENDPOINT);

function getWalletFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('wallet');
}

let username = getWalletFromUrl();
if (!username) {
  username = prompt("Connecte-toi avec Phantom. (DEBUG: Entrez un pseudo manuellement)");
  if (!username || username.trim() === "") {
    alert("Un pseudo est obligatoire pour jouer !");
    throw new Error("Aucun pseudo fourni.");
  }
}
window.username = username;

// === CONFIG PHASER (à lancer uniquement APRÈS connexion MMO) ===
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scene: [
    LoaderScene,
    BeachScene,
    VillageScene,
    Road1Scene,
    VillageLabScene,
    VillageHouse1Scene,
    LavandiaScene
  ],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  plugins: {
    scene: [
      {
        key: 'animatedTiles',
        plugin: AnimatedTiles,
        mapping: 'animatedTiles'
      }
    ]
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// === CSS pour le HUD de sélection de starter ===
const starterHudCSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
#starter-selection-hud { font-family: 'Orbitron', 'Arial', sans-serif !important; animation: fadeIn 0.5s ease-in-out; }
#starter-selection-hud h1 { text-transform: uppercase; letter-spacing: 2px; }
#starter-selection-hud img { transition: transform 0.3s ease; }
#starter-selection-hud img:hover { transform: scale(1.1); }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.starter-card { animation: slideUp 0.6s ease-out; }
.starter-card:nth-child(1) { animation-delay: 0.1s; }
.starter-card:nth-child(2) { animation-delay: 0.2s; }
.starter-card:nth-child(3) { animation-delay: 0.3s; }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.starter-success-message { animation: bounceIn 0.8s ease-out; }
@keyframes bounceIn { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
`;
const styleSheet = document.createElement('style');
styleSheet.textContent = starterHudCSS;
document.head.appendChild(styleSheet);

console.log("[DEBUG ROOT] JS bootstrap - reload complet ?");

// ==== Connexion Colyseus + Initialisation des systèmes ====
// 🚨 NE PAS LANCER Phaser AVANT D’AVOIR UN NETWORK CONNECTÉ 🚨
(async () => {
  try {
    // 1. Notifications
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Système de notification initialisé");

    // 2. Connexion à la WorldRoom principale
    console.log("🌐 Connexion à la WorldRoom...");
    const gameRoom = await client.joinOrCreate("world", { username });
    window.currentGameRoom = gameRoom; // Stocke la GameRoom globale
    console.log("✅ Connecté à la WorldRoom", gameRoom.sessionId);

    // 3. Connexion à la WorldChatRoom (optionnel, si tu veux du chat global)
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    console.log("✅ Connecté à la WorldChatRoom");

    // 4. Initialise le chat
    initPokeChat(worldChat, window.username);

    // 5. NetworkManager (optionnel : tu peux aussi ne plus t’en servir)
    window.globalNetworkManager = new NetworkManager(gameRoom, window.username);

    // 6. Lancement de Phaser APRES connexion réseau
    window.game = new Phaser.Game(config);

    // 7. Setup global pour tes systèmes
    window.starterHUD = null;
    window.questSystemGlobal = null;
    window.inventorySystemGlobal = null;

    // 8. Expose helpers initAllGameSystems & cie
    window.initInventorySystem = function(gameRoom) {
      if (!window.inventorySystemGlobal) {
        window.inventorySystemGlobal = new InventorySystem(null, gameRoom);
        if (window.inventorySystemGlobal.inventoryUI) {
          window.inventorySystemGlobal.inventoryUI.currentLanguage = 'en';
        }
        window.inventorySystem = window.inventorySystemGlobal;
        if (typeof window.connectInventoryToServer === 'function') {
          window.connectInventoryToServer(gameRoom);
        }
        window.onSystemInitialized && window.onSystemInitialized('inventory');
        return window.inventorySystemGlobal;
      }
      return window.inventorySystemGlobal;
    };
    window.initStarterHUD = function(gameRoom) {
      if (!window.starterHUD) {
        window.starterHUD = new StarterSelectionHUD(gameRoom);
        gameRoom.onMessage("welcomeMessage", (data) => {
          window.gameNotificationSystem?.show(
            data.message || "Bienvenue dans le jeu !",
            'info',
            { duration: 5000, position: 'top-center', bounce: true }
          );
        });
        window.onSystemInitialized && window.onSystemInitialized('starter');
        return window.starterHUD;
      }
      return window.starterHUD;
    };
    window.initQuestSystem = function(scene, gameRoom) {
      if (!window.questSystemGlobal) {
        window.questSystemGlobal = new QuestSystem(scene, gameRoom);
        window.onSystemInitialized && window.onSystemInitialized('quests');
        return window.questSystemGlobal;
      }
      return window.questSystemGlobal;
    };
    window.initAllGameSystems = function(scene, gameRoom) {
      const inventory = window.initInventorySystem(gameRoom);
      const quests = window.initQuestSystem(scene, gameRoom);
      const starter = window.initStarterHUD(gameRoom);
      setTimeout(() => {
        window.onSystemInitialized && window.onSystemInitialized('all');
      }, 1000);
      return { inventory, quests, starter };
    };

    // === Fonctions d’accès rapide, notifications, tests etc ===
    window.openInventory = function() {
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.openInventory();
        window.showGameNotification("Inventaire ouvert", "info", { duration: 1500, position: 'bottom-right' });
      } else {
        window.showGameAlert?.("Système d'inventaire non initialisé");
      }
    };
    window.toggleInventory = function() {
      if (window.inventorySystemGlobal) {
        const wasOpen = window.inventorySystemGlobal.isInventoryOpen();
        window.inventorySystemGlobal.toggleInventory();
        if (!wasOpen) {
          window.showGameNotification("Inventaire ouvert", "info", { duration: 1000, position: 'bottom-right' });
        }
      } else {
        window.showGameAlert?.("Aucun système d'inventaire disponible");
      }
    };
    window.openQuestJournal = function() {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.openQuestJournal();
        window.showGameNotification("Journal des quêtes ouvert", "info", { duration: 1500, position: 'bottom-center' });
      } else {
        window.showGameAlert?.("Système de quêtes non initialisé");
      }
    };
    window.showStarterSelection = function() {
      if (window.starterHUD) {
        window.starterHUD.show();
        window.showGameNotification("Sélection de starter disponible", "info", { duration: 3000, position: 'top-center' });
      } else {
        window.showGameAlert?.("HUD de starter non initialisé");
      }
    };
    window.testInventory = function() {
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.toggleInventory();
        setTimeout(() => {
          window.showGameNotification("Test d'inventaire réussi !", "success", { duration: 2000, position: 'top-center' });
        }, 500);
      } else {
        window.showGameAlert?.("Système d'inventaire non initialisé");
      }
    };
    // ...autres helpers selon tes besoins

    // === Notification d’aide et ready ===
    showNotificationInstructions();
    setTimeout(() => {
      window.showGameNotification("Game system ready!", "success", { duration: 3000, position: 'top-center', bounce: true });
    }, 2000);

    console.log("🎯 Tous les systèmes initialisés !");
    console.log("📋 Utilisez 'Q' pour ouvrir le journal des quêtes en jeu");
    console.log("🎒 Utilisez 'I' pour ouvrir l'inventaire en jeu");
    console.log("🎮 Utilisez window.initAllGameSystems(scene, gameRoom) dans vos scènes pour tout initialiser");
  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    window.showGameAlert?.(`Erreur: ${e.message}`) || alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

export default {}; // plus besoin d’exporter le game ici, il est sur window

// === Fonctions utilitaires exposées (raccourcis) ===
window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};
window.isStarterHUDOpen = function() {
  return window.starterHUD ? window.starterHUD.isVisible : false;
};
window.isQuestJournalOpen = function() {
  return window.questSystemGlobal ? window.questSystemGlobal.isQuestJournalOpen() : false;
};
window.isInventoryOpen = function() {
  if (window.inventorySystemGlobal) return window.inventorySystemGlobal.isInventoryOpen();
  if (typeof window.isInventoryVisible === 'function') return window.isInventoryVisible();
  return false;
};
window.shouldBlockInput = function() {
  return window.isChatFocused() ||
    window.isStarterHUDOpen() ||
    window.isQuestJournalOpen() ||
    window.isInventoryOpen();
};
window.canPlayerInteract = function() {
  if (window.inventorySystemGlobal) return window.inventorySystemGlobal.canPlayerInteract();
  if (window.questSystemGlobal) return window.questSystemGlobal.canPlayerInteract();
  return !window.shouldBlockInput();
};
window.getGameSystemsStatus = function() {
  const status = {
    chat: { initialized: !!window.pokeChat, focused: window.isChatFocused() },
    inventory: { initialized: !!window.inventorySystemGlobal, open: window.isInventoryOpen() },
    quests: { initialized: !!window.questSystemGlobal, journalOpen: window.isQuestJournalOpen() },
    starter: { initialized: !!window.starterHUD, open: window.isStarterHUDOpen() },
    notifications: {
      initialized: !!window.gameNotificationSystem,
      manager: window.NotificationManager ? 'Available' : 'Not Available',
      ready: window.gameNotificationSystem ? window.gameNotificationSystem.isReady() : false
    },
    canInteract: window.canPlayerInteract(),
    inputBlocked: window.shouldBlockInput()
  };
  return status;
};
window.debugGameSystems = function() {
  const status = window.getGameSystemsStatus();
  console.log("🔍 État des systèmes de jeu:", status);
  window.debugNotificationSystem && window.debugNotificationSystem();
  return status;
};
window.quickTestNotifications = function() {
  console.log("🧪 Test rapide des notifications...");
  window.testNotifications?.();
};
window.showGameHelp = function() {
  window.showGameNotification?.("Aide affichée dans la console", "info", { duration: 3000, position: 'top-center' });
  console.log(`
🎮 === AIDE DU JEU ===

=== Contrôles de base ===
• I - Ouvrir/Fermer l'inventaire
• Q - Ouvrir/Fermer le journal des quêtes
• E - Interagir avec NPCs/objets
• WASD ou Flèches - Déplacement

=== Fonctions de test ===
• window.testInventory() - Tester l'inventaire
• window.testNotifications() - Tester les notifications
• window.quickTestNotifications() - Test rapide
• window.debugGameSystems() - Debug des systèmes

=== Systèmes disponibles ===
• Inventaire: ${!!window.inventorySystemGlobal}
• Quêtes: ${!!window.questSystemGlobal}
• Notifications: ${!!window.gameNotificationSystem}
• Starter HUD: ${!!window.starterHUD}

=== Pour les développeurs ===
• window.showNotificationInstructions() - Instructions complètes
• window.debugNotificationSystem() - Debug notifications
• window.getGameSystemsStatus() - Statut des systèmes
========================
  `);
};
console.log(`
🎉 === POKÉMON MMO PRÊT ===
Utilisez window.showGameHelp() pour l'aide complète
Tous les systèmes sont initialisés et prêts !
==============================
`);
