import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
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

// === ✅ NOUVEAU: Import du système de notification centralisé ===
import { initializeGameNotifications, showNotificationInstructions } from './notification.js';

// === ✅ NOUVEAU: Import du debug de notifications ===
import './debug-notifications.js';

// --- Endpoint dynamique ---
const ENDPOINT =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.hostname +
  (location.port ? ":" + location.port : "") +
  "/ws";

const colyseus = new Client(ENDPOINT);

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

const game = new Phaser.Game(config);
window.game = game;

// === CSS pour le HUD de sélection de starter ===
const starterHudCSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

#starter-selection-hud {
  font-family: 'Orbitron', 'Arial', sans-serif !important;
  animation: fadeIn 0.5s ease-in-out;
}

#starter-selection-hud h1 {
  text-transform: uppercase;
  letter-spacing: 2px;
}

#starter-selection-hud img {
  transition: transform 0.3s ease;
}

#starter-selection-hud img:hover {
  transform: scale(1.1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.starter-card {
  animation: slideUp 0.6s ease-out;
}

.starter-card:nth-child(1) { animation-delay: 0.1s; }
.starter-card:nth-child(2) { animation-delay: 0.2s; }
.starter-card:nth-child(3) { animation-delay: 0.3s; }

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.starter-success-message {
  animation: bounceIn 0.8s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
`;

// Injecter le CSS dans la page
const styleSheet = document.createElement('style');
styleSheet.textContent = starterHudCSS;
document.head.appendChild(styleSheet);

// ==== Connexion Colyseus + Initialisation des systèmes ====
(async () => {
  try {
    // ✅ ÉTAPE 1: Initialiser le système de notification AVANT tout le reste
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Système de notification initialisé");

    // Connexion à la WorldChatRoom
    const worldChat = await colyseus.joinOrCreate("worldchat", { username: window.username });
    window.worldChat = worldChat;
    console.log("✅ Connecté à la WorldChatRoom");

    // Initialise le chat stylé
    initPokeChat(worldChat, window.username);

    // === INITIALISATION DES SYSTÈMES DE JEU ===
    
    // Variables globales pour stocker les systèmes
    window.starterHUD = null;
    window.questSystemGlobal = null;
    window.inventorySystemGlobal = null;
    
    // ✅ Fonction globale pour initialiser le système d'inventaire
    window.initInventorySystem = function(gameRoom) {
      if (!window.inventorySystemGlobal) {
        console.log("🎒 Initialisation du système d'inventaire global");
        window.inventorySystemGlobal = new InventorySystem(null, gameRoom);
        
        // Configurer la langue
        if (window.inventorySystemGlobal.inventoryUI) {
          window.inventorySystemGlobal.inventoryUI.currentLanguage = 'en';
          console.log("🌐 Langue de l'inventaire définie sur: English");
        }
        
        // Rendre accessible globalement
        window.inventorySystem = window.inventorySystemGlobal;
        
        // Connecter l'inventaire standalone (rétrocompatibilité)
        if (typeof window.connectInventoryToServer === 'function') {
          window.connectInventoryToServer(gameRoom);
        }
        
        // ✅ Notification via le système centralisé
        window.onSystemInitialized('inventory');
        
        console.log("✅ Système d'inventaire initialisé");
        return window.inventorySystemGlobal;
      }
      return window.inventorySystemGlobal;
    };
    
    // ✅ Fonction globale pour initialiser le HUD de starter
    window.initStarterHUD = function(gameRoom) {
      if (!window.starterHUD) {
        console.log("🎮 Initialisation du HUD de sélection de starter");
        window.starterHUD = new StarterSelectionHUD(gameRoom);
        
        // Écouter les événements additionnels
        gameRoom.onMessage("welcomeMessage", (data) => {
          console.log("📨 Message de bienvenue:", data.message);
          
          // ✅ Utiliser le système de notification centralisé
          if (window.gameNotificationSystem) {
            window.gameNotificationSystem.show(
              data.message || "Bienvenue dans le jeu !",
              'info',
              {
                duration: 5000,
                position: 'top-center',
                bounce: true
              }
            );
          }
        });
        
        // ✅ Notification d'initialisation
        window.onSystemInitialized('starter');
        
        return window.starterHUD;
      }
      return window.starterHUD;
    };

    // ✅ Fonction globale pour initialiser le système de quêtes
    window.initQuestSystem = function(scene, gameRoom) {
      if (!window.questSystemGlobal) {
        console.log("🎯 Initialisation du système de quêtes global");
        window.questSystemGlobal = new QuestSystem(scene, gameRoom);
        
        // ✅ Notification d'initialisation
        window.onSystemInitialized('quests');
        
        return window.questSystemGlobal;
      }
      return window.questSystemGlobal;
    };

    // ✅ Fonction globale pour initialiser TOUS les systèmes
    window.initAllGameSystems = function(scene, gameRoom) {
      console.log("🎮 Initialisation de tous les systèmes de jeu...");
      
      // Initialiser tous les systèmes
      const inventory = window.initInventorySystem(gameRoom);
      const quests = window.initQuestSystem(scene, gameRoom);
      const starter = window.initStarterHUD(gameRoom);
      
      // ✅ Notification globale d'initialisation via le système centralisé
      setTimeout(() => {
        window.onSystemInitialized('all');
      }, 1000);
      
      console.log("✅ Tous les systèmes initialisés!");
      return {
        inventory: inventory,
        quests: quests,
        starter: starter
      };
    };

    // === FONCTIONS POUR LES SYSTÈMES ===

    // Fonction pour déclencher manuellement la sélection de starter
    window.showStarterSelection = function() {
      if (window.starterHUD) {
        window.starterHUD.show();
        window.showGameNotification("Sélection de starter disponible", "info", {
          duration: 3000,
          position: 'top-center'
        });
      } else {
        console.warn("⚠️ HUD de starter non initialisé");
        window.showGameAlert("HUD de starter non initialisé");
      }
    };

    // === FONCTIONS GLOBALES POUR LES QUÊTES ===
    
    window.openQuestJournal = function() {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.openQuestJournal();
        window.showGameNotification("Journal des quêtes ouvert", "info", {
          duration: 1500,
          position: 'bottom-center'
        });
      } else {
        console.warn("⚠️ Système de quêtes non initialisé");
        window.showGameAlert("Système de quêtes non initialisé");
      }
    };

    window.triggerQuestCollect = function(itemId, amount = 1) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerCollectEvent(itemId, amount);
        // ✅ FIX: NE PAS ajouter de notification ici, c'est déjà géré dans triggerCollectEvent
      } else {
        // Fallback
        window.showGameNotification(`Objet collecté: ${itemId} x${amount}`, "inventory", {
          duration: 2000
        });
      }
    };

    window.triggerQuestDefeat = function(pokemonId) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerDefeatEvent(pokemonId);
        // ✅ FIX: NE PAS ajouter de notification ici, c'est déjà géré dans triggerDefeatEvent
      } else {
        window.onPlayerAction('battleWon', { pokemonId });
      }
    };

    window.triggerQuestReach = function(zoneId, x, y, map) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerReachEvent(zoneId, x, y, map);
        // ✅ FIX: NE PAS ajouter de notification ici, c'est déjà géré dans triggerReachEvent
      } else {
        window.onZoneEntered(zoneId);
      }
    };

    window.triggerQuestDeliver = function(npcId, itemId) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerDeliverEvent(npcId, itemId);
        // ✅ FIX: NE PAS ajouter de notification ici, c'est déjà géré dans triggerDeliverEvent
      } else {
        window.showGameNotification(`Objet livré: ${itemId}`, "success", {
          duration: 3000
        });
      }
    };

    // === FONCTIONS GLOBALES POUR L'INVENTAIRE ===
    
    window.openInventory = function() {
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.openInventory();
        window.showGameNotification("Inventaire ouvert", "info", {
          duration: 1500,
          position: 'bottom-right'
        });
      } else {
        console.warn("⚠️ Système d'inventaire non initialisé");
        window.showGameAlert("Système d'inventaire non initialisé");
      }
    };
    
    window.toggleInventory = function() {
      if (window.inventorySystemGlobal) {
        const wasOpen = window.inventorySystemGlobal.isInventoryOpen();
        window.inventorySystemGlobal.toggleInventory();
        
        if (!wasOpen) {
          window.showGameNotification("Inventaire ouvert", "info", {
            duration: 1000,
            position: 'bottom-right'
          });
        }
      } else if (typeof window.toggleInventoryStandalone === 'function') {
        // Fallback vers l'inventaire standalone
        window.toggleInventoryStandalone();
      } else {
        console.warn("⚠️ Aucun système d'inventaire disponible");
        window.showGameAlert("Aucun système d'inventaire disponible");
      }
    };
    
    window.addItemToPlayer = function(itemId, quantity = 1) {
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.onItemPickup(itemId, quantity);
        // La notification est gérée automatiquement par le système d'inventaire
      } else {
        // Fallback
        window.showGameNotification(`+${quantity} ${itemId}`, "inventory", {
          duration: 3000,
          position: 'bottom-right'
        });
      }
    };
    
    window.useItem = function(itemId) {
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.useItem(itemId);
        window.showGameNotification(`Utilisation: ${itemId}`, "info", {
          duration: 2000,
          type: 'inventory'
        });
      } else {
        window.showGameAlert("Impossible d'utiliser l'objet");
      }
    };
    
    window.hasItem = function(itemId) {
      if (window.inventorySystemGlobal) {
        return window.inventorySystemGlobal.hasItem(itemId);
      }
      return false;
    };

    // === FONCTIONS DE TEST SIMPLIFIÉES ===
    
    window.testInventory = function() {
      console.log("🧪 Test de l'inventaire...");
      
      window.showGameNotification("Test de l'inventaire en cours...", "info", {
        duration: 2000,
        position: 'top-center'
      });
      
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.toggleInventory();
        
        setTimeout(() => {
          window.showGameNotification("Test d'inventaire réussi !", "success", {
            duration: 2000,
            position: 'top-center'
          });
        }, 500);
      } else {
        window.showGameAlert("Système d'inventaire non initialisé");
      }
    };

    window.testAddItem = function(itemId = 'poke_ball', quantity = 1) {
      console.log(`🧪 Test ajout d'objet: ${itemId} x${quantity}`);
      
      window.showGameNotification(`Test ajout: ${itemId} x${quantity}`, "info", {
        duration: 2000,
        position: 'bottom-center'
      });
      
      if (window.worldChat && window.worldChat.connection && window.worldChat.connection.isOpen) {
        window.showGameAlert("Utilisez une GameRoom pour tester l'ajout d'objets");
      } else {
        window.showGameAlert("Pas de connexion serveur pour tester l'ajout d'objets");
      }
    };

    // === AFFICHAGE DES INSTRUCTIONS ===
    
    // Afficher les instructions dans la console
    showNotificationInstructions();
    
    // Notification finale
    setTimeout(() => {
      window.showGameNotification("Système de jeu prêt !", "success", {
        duration: 3000,
        position: 'top-center',
        bounce: true
      });
    }, 2000);

    console.log("🎯 Tous les systèmes initialisés !");
    console.log("📋 Utilisez 'Q' pour ouvrir le journal des quêtes en jeu");
    console.log("🎒 Utilisez 'I' pour ouvrir l'inventaire en jeu");
    console.log("🎮 Utilisez window.initAllGameSystems(scene, gameRoom) dans vos scènes pour tout initialiser");

  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    
    // Afficher l'erreur via le système de notification si disponible
    if (window.gameNotificationSystem) {
      window.showGameAlert(`Erreur: ${e.message}`);
    } else {
      alert("Impossible de rejoindre le serveur : " + e.message);
    }
    
    throw e;
  }
})();

export default game;

// === FONCTIONS UTILITAIRES POUR LE JEU ===

// Vérifier si le chat a le focus
window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};

// Vérifier si le HUD de starter est ouvert
window.isStarterHUDOpen = function() {
  return window.starterHUD ? window.starterHUD.isVisible : false;
};

// Vérifier si le journal de quêtes est ouvert
window.isQuestJournalOpen = function() {
  return window.questSystemGlobal ? window.questSystemGlobal.isQuestJournalOpen() : false;
};

// Vérifier si l'inventaire est ouvert
window.isInventoryOpen = function() {
  if (window.inventorySystemGlobal) {
    return window.inventorySystemGlobal.isInventoryOpen();
  }
  // Fallback vers l'inventaire standalone
  if (typeof window.isInventoryVisible === 'function') {
    return window.isInventoryVisible();
  }
  return false;
};

// Fonction utilitaire pour les scènes Phaser
window.shouldBlockInput = function() {
  return window.isChatFocused() || 
         window.isStarterHUDOpen() || 
         window.isQuestJournalOpen() ||
         window.isInventoryOpen();
};

// Vérifier si le joueur peut interagir
window.canPlayerInteract = function() {
  // Priorité au système d'inventaire s'il existe
  if (window.inventorySystemGlobal) {
    return window.inventorySystemGlobal.canPlayerInteract();
  }
  
  // Fallback vers le système de quêtes
  if (window.questSystemGlobal) {
    return window.questSystemGlobal.canPlayerInteract();
  }
  
  // Fallback basique
  return !window.shouldBlockInput();
};

// Fonction utilitaire pour obtenir des informations sur l'état du jeu
window.getGameSystemsStatus = function() {
  const status = {
    chat: {
      initialized: !!window.pokeChat,
      focused: window.isChatFocused()
    },
    inventory: {
      initialized: !!window.inventorySystemGlobal,
      open: window.isInventoryOpen()
    },
    quests: {
      initialized: !!window.questSystemGlobal,
      journalOpen: window.isQuestJournalOpen()
    },
    starter: {
      initialized: !!window.starterHUD,
      open: window.isStarterHUDOpen()
    },
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

// Fonction de debug pour afficher l'état de tous les systèmes
window.debugGameSystems = function() {
  const status = window.getGameSystemsStatus();
  console.log("🔍 État des systèmes de jeu:", status);
  
  // Utiliser le système de notification pour le debug
  if (window.debugNotificationSystem) {
    window.debugNotificationSystem();
  }
  
  return status;
};

// === RACCOURCIS POUR LES DÉVELOPPEURS ===

// Fonction pour tester rapidement les notifications
window.quickTestNotifications = function() {
  console.log("🧪 Test rapide des notifications...");
  
  if (window.testNotifications) {
    window.testNotifications();
  } else {
    console.warn("⚠️ Système de notification non disponible");
  }
};

// Fonction pour afficher l'aide
window.showGameHelp = function() {
  if (window.gameNotificationSystem) {
    window.showGameNotification("Aide affichée dans la console", "info", {
      duration: 3000,
      position: 'top-center'
    });
  }
  
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

// === MESSAGE FINAL ===
console.log(`
🎉 === POKÉMON MMO PRÊT ===
Utilisez window.showGameHelp() pour l'aide complète
Tous les systèmes sont initialisés et prêts !
==============================
`);
