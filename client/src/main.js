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
import { TimeService } from './services/TimeService.js';
import { LavandiaAnalysisScene } from './scenes/zones/LavandiaAnalysisScene.js';
import { LavandiaBossRoomScene } from './scenes/zones/LavandiaBossRoomScene.js';
import { LavandiaCelibiTempleScene } from './scenes/zones/LavandiaCelibiTempleScene.js';
import { LavandiaEquipementScene } from './scenes/zones/LavandiaEquipementScene.js';
import { LavandiaFurnitureScene } from './scenes/zones/LavandiaFurnitureScene.js';
import { LavandiaHealingCenterScene } from './scenes/zones/LavandiaHealingCenterScene.js';
import { LavandiaHouse1Scene } from './scenes/zones/LavandiaHouse1Scene.js';
import { LavandiaHouse2Scene } from './scenes/zones/LavandiaHouse2Scene.js';
import { LavandiaHouse3Scene } from './scenes/zones/LavandiaHouse3Scene.js';
import { LavandiaHouse4Scene } from './scenes/zones/LavandiaHouse4Scene.js';
import { LavandiaHouse5Scene } from './scenes/zones/LavandiaHouse5Scene.js';
import { LavandiaHouse6Scene } from './scenes/zones/LavandiaHouse6Scene.js';
import { LavandiaHouse7Scene } from './scenes/zones/LavandiaHouse7Scene.js';
import { LavandiaHouse8Scene } from './scenes/zones/LavandiaHouse8Scene.js';
import { LavandiaHouse9Scene } from './scenes/zones/LavandiaHouse9Scene.js';
import { LavandiaResearchLabScene } from './scenes/zones/LavandiaResearchLabScene.js';
import { LavandiaShopScene } from './scenes/zones/LavandiaShopScene.js';
//import { NoctherCave1Scene } from './scenes/zones/NoctherCave1Scene.js';
//import { NoctherCave2Scene } from './scenes/zones/NoctherCave2Scene.js';
//import { NoctherCave2BisScene } from './scenes/zones/NoctherCave2BisScene.js';
//import { Road1HouseScene } from './scenes/zones/Road1HouseScene.js';
//import { Road2Scene } from './scenes/zones/Road2Scene.js';
//import { Road3Scene } from './scenes/zones/Road3Scene.js';
import { VillageFloristScene } from './scenes/zones/VillageFloristScene.js';
import { VillageHouse2Scene } from './scenes/zones/VillageHouse2Scene.js';


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

// ✅ NOUVEAU: Fonction d'initialisation du système de scènes
async function initializeSceneSystem() {
  console.log("🏗️ [MAIN] === INITIALISATION SYSTÈME DE SCÈNES ===");
  
  const registry = SceneRegistry.getInstance();
  
  // ✅ Enregistrer toutes les classes de scènes dans le registry
  console.log("📝 [MAIN] Enregistrement des classes de scènes...");
  registry.registerSceneClass('beach', BeachScene);
  registry.registerSceneClass('village', VillageScene);
  registry.registerSceneClass('villagelab', VillageLabScene);
  registry.registerSceneClass('road1', Road1Scene);
  registry.registerSceneClass('villagehouse1', VillageHouse1Scene);
  registry.registerSceneClass('lavandia', LavandiaScene);
  
  console.log("✅ [MAIN] Toutes les scènes enregistrées dans le registry");
  
  // ✅ Exposer globalement pour l'utilisation dans les transitions
  window.sceneRegistry = registry;
  
  // ✅ Ajouter des fonctions utilitaires globales
  window.switchToZone = async function(zoneName, transitionData = {}) {
    const sceneKey = registry.getSceneKey(zoneName);
    console.log(`🔄 [MAIN] Changement vers zone: ${zoneName} (${sceneKey})`);
    
    // Vérifier si la scène existe
    const targetScene = window.game.scene.getScene(sceneKey);
    if (!targetScene) {
      console.error(`❌ [MAIN] Scène ${sceneKey} introuvable`);
      return false;
    }
    
    // Redémarrage propre
    if (window.game.scene.isActive(sceneKey)) {
      window.game.scene.stop(sceneKey);
    }
    
    window.game.scene.start(sceneKey, {
      fromTransition: true,
      networkManager: window.globalNetworkManager,
      ...transitionData
    });
    
    return true;
  };
  
  window.restartCurrentZone = function() {
    const currentScene = window.game.scene.getScenes(true)[0];
    if (currentScene) {
      const sceneKey = currentScene.scene.key;
      console.log(`🔄 [MAIN] Redémarrage zone actuelle: ${sceneKey}`);
      window.game.scene.restart(sceneKey);
    }
  };
  
  window.listAvailableZones = function() {
    const zones = registry.getAvailableZones();
    console.log(`🌍 [MAIN] Zones disponibles:`, zones);
    return zones;
  };
  
  window.debugSceneRegistry = function() {
    console.log(`🔍 [MAIN] === DEBUG SCENE REGISTRY ===`);
    registry.debugInfo();
    
    // Vérifier aussi les scènes dans Phaser
    const phaserScenes = Object.keys(window.game?.scene?.manager?.keys || {});
    console.log(`🎬 Scènes Phaser:`, phaserScenes);
    
    return {
      registryZones: registry.getAvailableZones(),
      phaserScenes: phaserScenes
    };
  };
  
  return registry;
}

// === CONFIG PHASER ===
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  // ✅ GARDER TOUTES LES SCÈNES pour éviter les problèmes de "scène introuvable"
  scene: [
  LoaderScene,

  // Village
  VillageScene,
  VillageLabScene,
  VillageHouse1Scene,
  VillageHouse2Scene,
  VillageFloristScene,

  // Beach
  BeachScene,

  // Road
  Road1Scene,
  //Road1HouseScene,
  //Road2Scene,
//  Road3Scene,

  // Lavandia
  LavandiaScene,
  LavandiaAnalysisScene,
  LavandiaBossRoomScene,
  LavandiaCelibTempleScene,
  LavandiaEquipementScene,
  LavandiaFurnitureScene,
  LavandiaHealingCenterScene,
  LavandiaHouse1Scene,
  LavandiaHouse2Scene,
  LavandiaHouse3Scene,
  LavandiaHouse4Scene,
  LavandiaHouse5Scene,
  LavandiaHouse6Scene,
  LavandiaHouse7Scene,
  LavandiaHouse8Scene,
  LavandiaHouse9Scene,
  LavandiaResearchLabScene,
  LavandiaShopScene,

  // NoctherCave
  //NoctherCave1Scene,
  //NoctherCave2Scene,
  //NoctherCave2BisScene
],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: true
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
// 🚨 NE PAS LANCER Phaser AVANT D'AVOIR UN NETWORK CONNECTÉ 🚨
(async () => {
  try {
    // 1. Notifications
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Système de notification initialisé");

    // ✅ 2. CRÉER LE NETWORKMANAGER GLOBAL ET SE CONNECTER
    console.log("🌐 Création et connexion du NetworkManager global...");
    window.globalNetworkManager = new NetworkManager(client, window.username);
    
    // ✅ 3. SE CONNECTER VIA LE NETWORKMANAGER (PAS EN PARALLÈLE)
    const connectionSuccess = await window.globalNetworkManager.connect("beach", {
      spawnX: 52,
      spawnY: 48
    });
    
    if (!connectionSuccess) {
      throw new Error("Échec de connexion à la WorldRoom via NetworkManager");
    }
    
    // ✅ 4. RÉCUPÉRER LA ROOM DEPUIS LE NETWORKMANAGER
    window.currentGameRoom = window.globalNetworkManager.room;
    console.log("✅ Connecté à la WorldRoom via NetworkManager:", window.currentGameRoom.sessionId);
    
    // ✅ 5. CONNEXION DU TIMESERVICE
    console.log("🕐 Connexion du TimeService au serveur...");
    TimeService.getInstance().connectToRoom(window.currentGameRoom);

    console.log("🔍 [DEBUG] SessionId après connexion:");
    console.log("- NetworkManager sessionId:", window.globalNetworkManager.getSessionId());
    console.log("- Room sessionId:", window.globalNetworkManager.room?.sessionId);
    console.log("- Room existe:", !!window.globalNetworkManager.room);
    console.log("- NetworkManager connecté:", window.globalNetworkManager.isConnected);
    
    // ✅ 6. INITIALISER LE SYSTÈME DE SCÈNES AVANT PHASER
    console.log("🏗️ Initialisation du système de scènes...");
    const sceneRegistry = await initializeSceneSystem();
    console.log("✅ Système de scènes initialisé");
    
    // ✅ 7. CONNEXION AU CHAT (SÉPARÉE)
    console.log("💬 Connexion à la WorldChatRoom...");
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    console.log("✅ Connecté à la WorldChatRoom");

    // 8. Initialise le chat
    initPokeChat(worldChat, window.username);

    // ✅ 9. LANCEMENT DE PHASER APRÈS TOUT LE SETUP
    console.log("🎮 Lancement de Phaser...");
    window.game = new Phaser.Game(config);

    // ✅ 10. VÉRIFIER QUE TOUTES LES SCÈNES SONT BIEN ENREGISTRÉES
    setTimeout(() => {
      console.log("🔍 [MAIN] Vérification des scènes Phaser...");
      const phaserScenes = Object.keys(window.game.scene.manager.keys);
      const registryZones = sceneRegistry.getAvailableZones();
      
      console.log(`🎬 Scènes dans Phaser: ${phaserScenes.length}`, phaserScenes);
      console.log(`📋 Zones dans Registry: ${registryZones.length}`, registryZones);
      
      // Vérifier correspondance
      registryZones.forEach(zone => {
        const sceneKey = sceneRegistry.getSceneKey(zone);
        const hasScene = phaserScenes.includes(sceneKey);
        console.log(`   ${zone} (${sceneKey}): ${hasScene ? '✅' : '❌'}`);
      });
    }, 1000);

    // ✅ 11. SETUP GLOBAL POUR TES SYSTÈMES (INCHANGÉ)
    window.starterHUD = null;
    window.questSystemGlobal = null;
    window.inventorySystemGlobal = null;

    // 12. Expose helpers initAllGameSystems & cie (INCHANGÉ)
    window.initInventorySystem = function(gameRoom) {
      if (!window.inventorySystemGlobal) {
        window.inventorySystemGlobal = new InventorySystem(null, gameRoom || window.currentGameRoom);
        if (window.inventorySystemGlobal.inventoryUI) {
          window.inventorySystemGlobal.inventoryUI.currentLanguage = 'en';
        }
        window.inventorySystem = window.inventorySystemGlobal;
        if (typeof window.connectInventoryToServer === 'function') {
          window.connectInventoryToServer(gameRoom || window.currentGameRoom);
        }
        window.onSystemInitialized && window.onSystemInitialized('inventory');
        return window.inventorySystemGlobal;
      }
      return window.inventorySystemGlobal;
    };
    
    window.initStarterHUD = function(gameRoom) {
      if (!window.starterHUD) {
        window.starterHUD = new StarterSelectionHUD(gameRoom || window.currentGameRoom);
        (gameRoom || window.currentGameRoom).onMessage("welcomeMessage", (data) => {
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
        window.questSystemGlobal = new QuestSystem(scene, gameRoom || window.currentGameRoom);
        window.onSystemInitialized && window.onSystemInitialized('quests');
        return window.questSystemGlobal;
      }
      return window.questSystemGlobal;
    };
    
    window.initAllGameSystems = function(scene, gameRoom) {
      const roomToUse = gameRoom || window.currentGameRoom;
      const inventory = window.initInventorySystem(roomToUse);
      const quests = window.initQuestSystem(scene, roomToUse);
      const starter = window.initStarterHUD(roomToUse);
      setTimeout(() => {
        window.onSystemInitialized && window.onSystemInitialized('all');
      }, 1000);
      return { inventory, quests, starter };
    };

    // === Fonctions d'accès rapide, notifications, tests etc === (INCHANGÉ)
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

    // ✅ NOUVELLES FONCTIONS POUR TESTER LES TRANSITIONS
    window.testTransition = function(targetZone = 'village') {
      console.log(`🧪 [MAIN] Test transition vers: ${targetZone}`);
      
      if (window.sceneRegistry && window.sceneRegistry.hasZone(targetZone)) {
        window.switchToZone(targetZone, { 
          spawnX: 100, 
          spawnY: 100,
          testMode: true 
        });
        window.showGameNotification(`Test transition vers ${targetZone}`, "info", { duration: 2000, position: 'top-center' });
      } else {
        window.showGameAlert?.(`Zone ${targetZone} non disponible`);
        console.error(`❌ [MAIN] Zone ${targetZone} non trouvée dans le registry`);
      }
    };
    
    window.forceTransition = function(targetZone) {
      console.log(`🚀 [MAIN] Transition forcée vers: ${targetZone}`);
      
      // Obtenir la scène active
      const activeScene = window.game.scene.getScenes(true)[0];
      if (activeScene && activeScene.transitionManager) {
        activeScene.transitionManager.forceTransition(targetZone);
      } else {
        console.warn(`⚠️ [MAIN] Aucun TransitionManager trouvé sur la scène active`);
        // Fallback avec switch simple
        window.switchToZone(targetZone);
      }
    };

    // === Notification d'aide et ready ===
    showNotificationInstructions();
    setTimeout(() => {
      window.showGameNotification("Game system ready!", "success", { duration: 3000, position: 'top-center', bounce: true });
    }, 2000);

    console.log("🎯 [MAIN] Tous les systèmes initialisés !");
    console.log("📋 Utilisez 'Q' pour ouvrir le journal des quêtes en jeu");
    console.log("🎒 Utilisez 'I' pour ouvrir l'inventaire en jeu");
    console.log("🎮 Utilisez window.initAllGameSystems(scene, gameRoom) dans vos scènes pour tout initialiser");
    console.log("🌍 Utilisez window.listAvailableZones() pour voir les zones disponibles");
    console.log("🔄 Utilisez window.testTransition('village') pour tester les transitions");
    
    // ✅ DEBUG: Vérifier l'état du NetworkManager
    console.log("🔍 État du NetworkManager global:", {
      exists: !!window.globalNetworkManager,
      isConnected: window.globalNetworkManager?.isConnected,
      sessionId: window.globalNetworkManager?.getSessionId(),
      currentZone: window.globalNetworkManager?.getCurrentZone(),
      roomId: window.globalNetworkManager?.room?.id
    });
    
  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    window.showGameAlert?.(`Erreur: ${e.message}`) || alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

export default {}; // plus besoin d'exporter le game ici, il est sur window

// === Fonctions utilitaires exposées (raccourcis) === (INCHANGÉ)
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

// ✅ FONCTION DEBUG AMÉLIORÉE
window.getGameSystemsStatus = function() {
  const status = {
    chat: { initialized: !!window.pokeChat, focused: window.isChatFocused() },
    inventory: { initialized: !!window.inventorySystemGlobal, open: window.isInventoryOpen() },
    quests: { initialized: !!window.questSystemGlobal, journalOpen: window.isQuestJournalOpen() },
    starter: { initialized: !!window.starterHUD, open: window.isStarterHUDOpen() },
    networkManager: {
      initialized: !!window.globalNetworkManager,
      connected: window.globalNetworkManager?.isConnected || false,
      sessionId: window.globalNetworkManager?.getSessionId() || null,
      currentZone: window.globalNetworkManager?.getCurrentZone() || null
    },
    notifications: {
      initialized: !!window.gameNotificationSystem,
      manager: window.NotificationManager ? 'Available' : 'Not Available',
      ready: window.gameNotificationSystem ? window.gameNotificationSystem.isReady() : false
    },
    // ✅ NOUVEAU: Info du SceneRegistry
    sceneRegistry: {
      initialized: !!window.sceneRegistry,
      availableZones: window.sceneRegistry?.getAvailableZones() || [],
      zoneCount: window.sceneRegistry?.getAvailableZones().length || 0
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
  
  // ✅ DEBUG SUPPLÉMENTAIRE NETWORKMANAGER
  if (window.globalNetworkManager) {
    console.log("📡 Debug NetworkManager:");
    window.globalNetworkManager.debugState();
  } else {
    console.log("❌ NetworkManager global introuvable");
  }
  
  // ✅ DEBUG SCENE REGISTRY
  if (window.sceneRegistry) {
    console.log("🏗️ Debug SceneRegistry:");
    window.debugSceneRegistry();
  } else {
    console.log("❌ SceneRegistry global introuvable");
  }
  
  return status;
};

window.quickTestNotifications = function() {
  console.log("🧪 Test rapide des notifications...");
  window.testNotifications?.();
};

// ✅ AIDE AMÉLIORÉE
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

=== Fonctions de transition (NOUVEAU) ===
• window.testTransition('village') - Test transition vers village
• window.forceTransition('beach') - Forcer transition
• window.listAvailableZones() - Lister zones disponibles
• window.switchToZone('road1') - Changer de zone manuellement
• window.debugSceneRegistry() - Debug du système de scènes

=== Systèmes disponibles ===
• Inventaire: ${!!window.inventorySystemGlobal}
• Quêtes: ${!!window.questSystemGlobal}
• Notifications: ${!!window.gameNotificationSystem}
• Starter HUD: ${!!window.starterHUD}
• NetworkManager: ${!!window.globalNetworkManager} (connecté: ${window.globalNetworkManager?.isConnected})
• SceneRegistry: ${!!window.sceneRegistry} (zones: ${window.sceneRegistry?.getAvailableZones().length || 0})

=== Pour les développeurs ===
• window.showNotificationInstructions() - Instructions complètes
• window.debugNotificationSystem() - Debug notifications
• window.getGameSystemsStatus() - Statut des systèmes
• window.restartCurrentZone() - Redémarrer la zone actuelle
========================
  `);
};

console.log(`
🎉 === POKÉMON MMO PRÊT ===
Utilisez window.showGameHelp() pour l'aide complète
Tous les systèmes sont initialisés et prêts !
🔄 Support des transitions robustes intégré !
==============================
`);
