import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { setupTeamSystem } from './integration/teamIntegration.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { DayNightWeatherManagerPhaser } from './game/DayNightWeatherManager.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { ClientTimeWeatherManager } from './managers/ClientTimeWeatherManager.js';
import { StarterUtils, integrateStarterSelectorToScene } from './components/StarterSelector.js';

import { LoaderScene } from "./scenes/LoaderScene.js";
import { BeachScene } from "./scenes/zones/BeachScene.js";
import { VillageScene } from "./scenes/zones/VillageScene.js";
import { Road1Scene } from './scenes/zones/Road1Scene.js';
import { VillageLabScene } from './scenes/zones/VillageLabScene.js';
import { VillageHouse1Scene } from './scenes/zones/VillageHouse1Scene.js';
import { LavandiaScene } from './scenes/zones/LavandiaScene.js';

import { LavandiaAnalysisScene } from './scenes/zones/LavandiaAnalysisScene.js';
import { LavandiaBossRoomScene } from './scenes/zones/LavandiaBossRoomScene.js';
import { LavandiaCelebiTempleScene } from './scenes/zones/LavandiaCelebiTempleScene.js';
import { LavandiaEquipmentScene } from './scenes/zones/LavandiaEquipmentScene.js';
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
import { Road1HouseScene } from './scenes/zones/Road1HouseScene.js';
import { Road1HiddenScene } from './scenes/zones/Road1HiddenScene.js';
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

// === Import de l'intro
import { PsyduckIntroManager } from './scenes/intros/PsyduckIntroManager.js';
// === Import du debug de notifications ===
import './debug-notifications.js';

// 🆕 NOUVEAU: Import du ClientEncounterManager
import { ClientEncounterManager } from './managers/EncounterManager.js';

// 🆕 NOUVEAU: Import du système de combat
import { BattleIntegration } from './managers/BattleIntegration.js';
import { BattleScene } from './scenes/BattleScene.js';

// --- Endpoint dynamique ---
const ENDPOINT =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.hostname +
  (location.port ? ":" + location.port : "") +
  "/ws";

// 1. Instancie un client Colyseus
const client = new Client(ENDPOINT);

window.client = client; // Exposer le client globalement

console.log("✅ Client Colyseus exposé globalement");

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

// Dans la console, corrigez le client :
// === CORRECTIONS À APPLIQUER DANS main.js ===

// 1. ❌ SUPPRIMER ces lignes (lignes 190-230 environ) :
// Dans la console, corrigez le client :
window.fixBattleClient = function() {
    console.log('🔧 === CORRECTION CLIENT BATTLE ===');
    
    // Vérifier que le système global client existe
    if (!window.client) {
        console.error('❌ Client Colyseus global manquant');
        return false;
    }
    
    // Vérifier que le battleSystem existe
    if (!window.battleSystem) {
        console.error('❌ BattleSystem manquant');
        return false;
    }
    
    // Récupérer le NetworkHandler et corriger le client
    const battleConnection = window.battleSystem.battleConnection;
    const networkHandler = battleConnection?.networkHandler;
    
    if (networkHandler) {
        console.log('🔄 Correction du client dans BattleNetworkHandler...');
        
        // Forcer le bon client
        networkHandler.client = window.client;
        
        console.log('✅ Client corrigé:', {
            hasJoinById: typeof networkHandler.client.joinById === 'function',
            clientType: typeof networkHandler.client,
            clientKeys: Object.keys(networkHandler.client)
        });
        
        return true;
    }
    
    console.error('❌ NetworkHandler introuvable');
    return false;
};

window.fixBattleClient = function() {
    console.log('🔧 === CORRECTION CLIENT BATTLE ===');
    
    // Vérifier que le système global client existe
    if (!window.client) {
        console.error('❌ Client Colyseus global manquant');
        return false;
    }
    
    // ✅ CORRECTION: Vérifier si battleSystem existe avant d'essayer de l'utiliser
    if (!window.battleSystem) {
        console.warn('⚠️ BattleSystem pas encore initialisé (normal au chargement)');
        return false;
    }
    
    // Récupérer le NetworkHandler et corriger le client
    const battleConnection = window.battleSystem.battleConnection;
    const networkHandler = battleConnection?.networkHandler;
    
    if (networkHandler) {
        console.log('🔄 Correction du client dans BattleNetworkHandler...');
        
        // Forcer le bon client
        networkHandler.client = window.client;
        
        console.log('✅ Client corrigé:', {
            hasJoinById: typeof networkHandler.client.joinById === 'function',
            clientType: typeof networkHandler.client,
            clientKeys: Object.keys(networkHandler.client)
        });
        
        return true;
    }
    
    console.error('❌ NetworkHandler introuvable');
    return false;
};

// Appliquez la correction
window.fixBattleClient();

async function initializeGlobalWeatherSystem() {
  console.log("🌤️ [MAIN] === INITIALISATION SYSTÈME MÉTÉO GLOBAL SIMPLE ===");
  
  try {
    // ✅ INITIALISER LE SYSTÈME GLOBAL
    console.log("🌍 [MAIN] Initialisation GlobalWeatherManager...");
    const success = await globalWeatherManager.initialize(window.globalNetworkManager);
    
    if (success) {
      console.log("✅ [MAIN] GlobalWeatherManager initialisé avec succès");
      
      // ✅ EXPOSER GLOBALEMENT
      window.globalWeatherManager = globalWeatherManager;
      window.weatherManagerGlobal = globalWeatherManager; // ← AJOUTEZ CETTE LIGNE

      
      // ✅ FONCTIONS UTILITAIRES GLOBALES
      window.getGlobalWeather = function() {
        return globalWeatherManager.getCurrentWeather();
      };
      
      window.getGlobalTime = function() {
        return globalWeatherManager.getCurrentTime();
      };
      
      // ✅ FONCTION D'ENREGISTREMENT SIMPLIFIÉE
      window.registerSceneToWeather = function(scene, zoneName) {
        if (!globalWeatherManager.isInitialized) {
          console.warn("⚠️ [GLOBAL] Système météo pas prêt pour enregistrement");
          return false;
        }
        
        console.log(`🌤️ [GLOBAL] Enregistrement scène météo: ${scene.scene.key} (zone: ${zoneName})`);
        return globalWeatherManager.registerScene(scene, zoneName);
      };
      
      // ✅ FONCTION DE CHANGEMENT DE ZONE
      window.onWeatherZoneChanged = function(zoneName) {
        globalWeatherManager.onZoneChanged(zoneName);
      };
      
      // ✅ FONCTIONS DE DEBUG
      window.debugGlobalWeather = function() {
        globalWeatherManager.debug();
      };
      
      window.forceWeatherUpdate = function() {
        globalWeatherManager.forceUpdate();
      };
      
      console.log("✅ [MAIN] Système météo global OPTIMAL configuré");
      
    } else {
      throw new Error("Échec initialisation GlobalWeatherManager");
    }
    
  } catch (error) {
    console.error("❌ [MAIN] Erreur initialisation système météo global:", error);
    
    // ✅ FALLBACK SÉCURISÉ en cas d'erreur
    window.globalWeatherManager = {
      isInitialized: false,
      error: error.message,
      getCurrentWeather: () => ({ weather: 'clear', displayName: 'Ciel dégagé' }),
      getCurrentTime: () => ({ hour: 12, isDayTime: true }),
      registerScene: () => false,
      onZoneChanged: () => {}
    };
    
    window.getGlobalWeather = () => ({ weather: 'clear', displayName: 'Ciel dégagé' });
    window.getGlobalTime = () => ({ hour: 12, isDayTime: true });
    window.registerSceneToWeather = () => false;
    window.onWeatherZoneChanged = () => {};
    
    console.log("✅ [MAIN] Système météo fallback configuré");
  }
}

// ✅ NOUVELLES FONCTIONS DE DEBUG AMÉLIORES
window.quickWeatherDebug = function() {
  console.log('⚡ === DEBUG RAPIDE MÉTÉO GLOBAL ===');
  
  if (window.globalWeatherManager) {
    const stats = window.globalWeatherManager.getStats();
    console.log('📊 Stats:', stats);
    
    if (stats.isInitialized) {
      console.log('✅ Système météo global OK');
      console.log('🕐 Temps:', window.getGlobalTime());
      console.log('🌤️ Météo:', window.getGlobalWeather());
    } else {
      console.log('❌ Système météo global pas initialisé');
    }
  } else {
    console.log('❌ GlobalWeatherManager manquant');
  }
};

window.testGlobalWeather = function() {
  if (!window.globalWeatherManager?.isInitialized) {
    console.error('❌ Système météo global pas prêt');
    return false;
  }
  
  const currentTime = window.getGlobalTime();
  const currentWeather = window.getGlobalWeather();
  
  console.log('⏰ Temps actuel:', currentTime);
  console.log('🌦️ Météo actuelle:', currentWeather);
  
  // Test de forçage d'update
  window.forceWeatherUpdate();
  
  return true;
};

// === CONFIG PHASER ===
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  pauseOnBlur: false,
  // ✅ GARDER TOUTES LES SCÈNES pour éviter les problèmes de "scène introuvable"
  // 🆕 NOUVEAU: Ajouter BattleScene
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
  Road1HouseScene,
  Road1HiddenScene,
  //Road2Scene,
//  Road3Scene,

  // Lavandia
  LavandiaScene,
  LavandiaAnalysisScene,
  LavandiaBossRoomScene,
  LavandiaCelebiTempleScene,
  LavandiaEquipmentScene,
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

  // 🆕 NOUVEAU: Battle Scene
  BattleScene
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
const starterSelectorCSS = `[LE CSS D'ARTIFACTS ICI]`;
const starterStyleSheet = document.createElement('style');
starterStyleSheet.textContent = starterSelectorCSS;
document.head.appendChild(starterStyleSheet);
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

    // ✅ 5.5. INITIALISER LE SYSTÈME MÉTÉO GLOBAL
console.log("🌤️ Initialisation du système météo global...");
    
await initializeGlobalWeatherSystem();
console.log("✅ Système météo global initialisé");

    
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

    // 🆕 NOUVEAU: 9.5. INITIALISER LE SYSTÈME DE COMBAT APRÈS PHASER
console.log("⚔️ Initialisation du système de combat...");
window.battleSystem = new BattleIntegration(window);

// ✅ CORRECTION: Attendre que Phaser soit complètement initialisé ET que le NetworkManager soit prêt
setTimeout(async () => {
  try {
    console.log("🔧 [MAIN] Vérification pré-requis système de combat...");
    
    // Vérifications
    const hasGame = !!window.game;
    const hasNetworkManager = !!window.globalNetworkManager;
    const hasRoom = !!window.currentGameRoom;
    const networkConnected = window.globalNetworkManager?.isConnected;
    
    console.log("📊 [MAIN] Pré-requis:", {
      hasGame,
      hasNetworkManager,
      hasRoom,
      networkConnected
    });
    
    if (!hasGame || !hasNetworkManager || !hasRoom || !networkConnected) {
      throw new Error("Pré-requis manquants pour le système de combat");
    }
    
    // ✅ CORRECTION: Utiliser directement la room du NetworkManager
    const battleInitSuccess = await window.battleSystem.initialize(
      window.globalNetworkManager.room, // Utiliser directement la room du NetworkManager
      window.game
    );
    
    if (battleInitSuccess) {
      console.log("✅ Système de combat initialisé avec succès");
      window.showGameNotification?.("Système de combat prêt !", "success", { 
        duration: 2000, 
        position: 'top-center' 
      });
    } else {
      throw new Error("Échec initialisation système de combat");
    }
    
  } catch (error) {
    console.error("❌ Erreur initialisation système de combat:", error);
    window.showGameNotification?.("Erreur système de combat", "error", { 
      duration: 3000, 
      position: 'top-center' 
    });
    
    // ✅ AJOUT: Fonction de debug pour diagnostiquer
    window.debugBattleInitialization = function() {
      console.log("🔍 === DEBUG INITIALISATION COMBAT ===");
      console.log("Game:", !!window.game);
      console.log("NetworkManager:", !!window.globalNetworkManager);
      console.log("Room:", !!window.currentGameRoom);
      console.log("BattleSystem:", !!window.battleSystem);
      console.log("Connected:", window.globalNetworkManager?.isConnected);
      console.log("Room ID:", window.currentGameRoom?.id);
      console.log("Session ID:", window.globalNetworkManager?.sessionId);
      
      if (window.battleSystem) {
        console.log("BattleSystem debug:", window.battleSystem.debug?.());
      }
    };
    
    console.log("🔧 Utilisez window.debugBattleInitialization() pour diagnostiquer");
  }
}, 3000); 

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
      
      // Vérifier BattleScene
      const hasBattleScene = phaserScenes.includes('BattleScene');
      console.log(`   BattleScene: ${hasBattleScene ? '✅' : '❌'}`);
      
    }, 1000);

    // ✅ 11. SETUP GLOBAL POUR TES SYSTÈMES
    window.starterHUD = null;
    window.questSystemGlobal = null;
    window.inventorySystemGlobal = null;
    window.teamManagerGlobal = null;
    // 🆕 NOUVEAU: Variable globale pour EncounterManager
    window.encounterManagerGlobal = null;
    window.weatherManagerGlobal = null;
    
    // 12. Expose helpers initAllGameSystems & cie
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

    // 🆕 NOUVEAU: Fonction d'initialisation du système d'encounters
    window.initEncounterSystem = function(scene, mapData = null) {
      console.log('🎲 [MAIN] Initialisation du système d\'encounters...');
      
      // ✅ VÉRIFIER SI DÉJÀ INITIALISÉ POUR CETTE SCÈNE
      if (scene && scene.encounterManager && scene.encounterInitialized) {
        console.log('ℹ️ [MAIN] Système d\'encounters déjà initialisé pour cette scène - réutilisation');
        return scene.encounterManager;
      }
      
      try {
        // ✅ CRÉER UN NOUVEL ENCOUNTER MANAGER
        const encounterManager = new ClientEncounterManager();
        
        // ✅ CHARGER LES DONNÉES DE CARTE SI DISPONIBLES
        if (mapData) {
          console.log('🗺️ [MAIN] Chargement données carte pour encounters...');
          encounterManager.loadMapData(mapData);
        } else if (scene && scene.map) {
          // Essayer de récupérer les données depuis la scène
          const mapKey = scene.mapKey || scene.scene.key.toLowerCase();
          const tilemapData = scene.cache?.tilemap?.get(mapKey);
          if (tilemapData && tilemapData.data) {
            console.log('🗺️ [MAIN] Données carte récupérées depuis la scène');
            encounterManager.loadMapData(tilemapData.data);
          } else {
            console.warn('⚠️ [MAIN] Impossible de récupérer les données de carte');
          }
        }
        
        // ✅ EXPOSER GLOBALEMENT
        window.encounterManagerGlobal = encounterManager;
        
        // ✅ SI ON A UNE SCÈNE, L'ASSOCIER
        if (scene) {
          scene.encounterManager = encounterManager;
          scene.encounterInitialized = true;
        }
        
        console.log('✅ [MAIN] Système d\'encounters initialisé avec succès');
        
        // ✅ DÉCLENCHER L'ÉVÉNEMENT
        if (typeof window.onSystemInitialized === 'function') {
          window.onSystemInitialized('encounters');
        }
        
        return encounterManager;
        
      } catch (error) {
        console.error('❌ [MAIN] Erreur initialisation système d\'encounters:', error);
        return null;
      }
    };
    
    window.initTeamSystem = function(gameRoom) {
      console.log('⚔️ [MAIN] Initialisation du système d\'équipe...');
      
      // ✅ VÉRIFIER SI DÉJÀ INITIALISÉ
      if (window.teamManagerGlobal && window.teamManagerGlobal.isInitialized) {
        console.log('ℹ️ [MAIN] Système d\'équipe déjà initialisé - réutilisation');
        
        // Mettre à jour la gameRoom si nécessaire
        if (gameRoom && gameRoom !== window.teamManagerGlobal.gameRoom) {
          window.teamManagerGlobal.gameRoom = gameRoom;
          window.teamManagerGlobal.setupServerListeners();
        }
        
        return window.teamManagerGlobal;
      }
      
      try {
        // ✅ APPELER DIRECTEMENT setupTeamSystem (PAS DE RÉCURSION)
        window.teamManagerGlobal = setupTeamSystem(gameRoom);
        
        if (window.teamManagerGlobal) {
          console.log('✅ [MAIN] Système d\'équipe initialisé avec succès');
          
          // Déclencher l'événement
          if (typeof window.onSystemInitialized === 'function') {
            window.onSystemInitialized('team');
          }
          
          return window.teamManagerGlobal;
        } else {
          console.error('❌ [MAIN] setupTeamSystem a retourné null');
          return null;
        }
        
      } catch (error) {
        console.error('❌ [MAIN] Erreur initialisation système d\'équipe:', error);
        return null;
      }
    };

    window.forceInitTeamSystem = function(gameRoom) {
      console.log('🔧 [MAIN] Force initialisation système d\'équipe...');
      
      // Nettoyer l'ancien système si il existe
      if (window.teamManagerGlobal) {
        console.log('🧹 [MAIN] Nettoyage ancien TeamManager...');
        if (window.teamManagerGlobal.destroy) {
          window.teamManagerGlobal.destroy();
        }
        window.teamManagerGlobal = null;
      }
      
      // Nettoyer les autres références
      if (window.TeamManager) {
        console.log('🧹 [MAIN] Nettoyage window.TeamManager...');
        if (window.TeamManager.destroy) {
          window.TeamManager.destroy();
        }
        window.TeamManager = null;
      }
      
      if (window.teamSystem) {
        if (window.teamSystem.destroy) {
          window.teamSystem.destroy();
        }
        window.teamSystem = null;
      }
      
      // Forcer la réinitialisation
      try {
        window.teamManagerGlobal = setupTeamSystem(gameRoom || window.currentGameRoom);
        
        if (window.teamManagerGlobal) {
          console.log('✅ [MAIN] Système d\'équipe forcé avec succès');
          
          // Déclencher l'événement
          if (typeof window.onSystemInitialized === 'function') {
            window.onSystemInitialized('team');
          }
          
          return window.teamManagerGlobal;
        } else {
          console.error('❌ [MAIN] Échec force initialisation');
          return null;
        }
        
      } catch (error) {
        console.error('❌ [MAIN] Erreur force initialisation:', error);
        return null;
      }
    };

    // 🆕 NOUVEAU: Fonction de force init pour encounters
    window.forceInitEncounterSystem = function(scene, mapData = null) {
      console.log('🔧 [MAIN] Force initialisation système d\'encounters...');
      
      // Nettoyer l'ancien système
      if (window.encounterManagerGlobal) {
        console.log('🧹 [MAIN] Nettoyage ancien EncounterManager...');
        window.encounterManagerGlobal = null;
      }
      
      if (scene) {
        scene.encounterManager = null;
        scene.encounterInitialized = false;
      }
      
      // Forcer la réinitialisation
      return window.initEncounterSystem(scene, mapData);
    };

    // 🆕 NOUVEAU: Initialisation du système de combat
    window.initBattleSystem = function(gameRoom) {
      console.log('⚔️ [MAIN] Initialisation du système de combat...');
      
      if (window.battleSystem && window.battleSystem.isInitialized) {
        console.log('ℹ️ [MAIN] Système de combat déjà initialisé - réutilisation');
        return window.battleSystem;
      }
      
      try {
        if (!window.battleSystem) {
          window.battleSystem = new BattleIntegration(window);
        }
        
        // Attendre que Phaser soit prêt
        if (window.game) {
          window.battleSystem.initialize(
            gameRoom || window.currentGameRoom,
            window.game
          ).then(success => {
            if (success) {
              console.log('✅ [MAIN] Système de combat initialisé avec succès');
              if (typeof window.onSystemInitialized === 'function') {
                window.onSystemInitialized('battle');
              }
            } else {
              console.error('❌ [MAIN] Échec initialisation système de combat');
            }
          });
        }
        
        return window.battleSystem;
        
      } catch (error) {
        console.error('❌ [MAIN] Erreur initialisation système de combat:', error);
        return null;
      }
    };

    // ===== 3. ✅ FONCTIONS DE DEBUG AMÉLIORÉES =====
    window.debugTeamSystem = function() {
      console.log('🔍 === DEBUG SYSTÈME D\'ÉQUIPE COMPLET ===');
      
      const teamStatus = {
        // Vérifications globales
        teamManagerGlobal: {
          exists: !!window.teamManagerGlobal,
          initialized: window.teamManagerGlobal?.isInitialized || false,
          type: typeof window.teamManagerGlobal
        },
        teamManagerWindow: {
          exists: !!window.TeamManager,
          initialized: window.TeamManager?.isInitialized || false,
          type: typeof window.TeamManager
        },
        
        // Vérifications UI
        teamIcon: {
          exists: !!document.querySelector('#team-icon'),
          visible: document.querySelector('#team-icon')?.style.display !== 'none',
          classes: document.querySelector('#team-icon')?.className || 'N/A'
        },
        
        // Vérifications réseau
        network: {
          globalNetworkManager: !!window.globalNetworkManager,
          currentGameRoom: !!window.currentGameRoom,
          connected: window.globalNetworkManager?.isConnected || false,
          roomState: window.globalNetworkManager?.room?.connection?.readyState || 'N/A'
        },
        
        // Fonctions disponibles
        functions: {
          initTeamSystem: typeof window.initTeamSystem,
          forceInitTeamSystem: typeof window.forceInitTeamSystem,
          testTeam: typeof window.testTeam,
          toggleTeam: typeof window.toggleTeam
        }
      };
      
      console.log('📊 Status complet:', teamStatus);
      
      // Tests supplémentaires
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (activeScene) {
        console.log('🎬 Scène active:', {
          key: activeScene.scene.key,
          teamSystemInitialized: activeScene.teamSystemInitialized,
          teamInitAttempts: activeScene.teamInitializationAttempts,
          hasTeamSystem: !!activeScene.getTeamManager
        });
      }
      
      return teamStatus;
    };

    // 🆕 NOUVEAU: Fonction de debug pour encounters
    window.debugEncounterSystem = function() {
      console.log('🔍 === DEBUG SYSTÈME D\'ENCOUNTERS COMPLET ===');
      
      const encounterStatus = {
        // Vérifications globales - CORRIGÉ
        encounterManagerGlobal: {
          exists: !!window.encounterManagerGlobal && window.encounterManagerGlobal !== null,
          type: typeof window.encounterManagerGlobal,
          isNull: window.encounterManagerGlobal === null,
          isUndefined: window.encounterManagerGlobal === undefined,
          stats: null,
          hasGetStats: !!(window.encounterManagerGlobal?.getStats)
        },
        
        // Vérifications scène active
        activeScene: null,
        
        // Fonctions disponibles
        functions: {
          initEncounterSystem: typeof window.initEncounterSystem,
          forceInitEncounterSystem: typeof window.forceInitEncounterSystem,
          testEncounter: typeof window.testEncounter,
          debugEncounters: typeof window.debugEncounters
        }
      };

      // ✅ RÉCUPÉRER LES STATS SI POSSIBLE
      try {
        if (window.encounterManagerGlobal && typeof window.encounterManagerGlobal.getStats === 'function') {
          encounterStatus.encounterManagerGlobal.stats = window.encounterManagerGlobal.getStats();
        }
      } catch (error) {
        encounterStatus.encounterManagerGlobal.statsError = error.message;
      }
      
      // Tests scène active
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (activeScene) {
        encounterStatus.activeScene = {
          key: activeScene.scene.key,
          encounterInitialized: activeScene.encounterInitialized,
          hasEncounterManager: !!activeScene.encounterManager,
          encounterManagerSame: activeScene.encounterManager === window.encounterManagerGlobal,
          sceneStats: null,
          encounterSystemStatus: activeScene.getEncounterSystemStatus ? activeScene.getEncounterSystemStatus() : 'N/A'
        };

        // ✅ RÉCUPÉRER STATS DE LA SCÈNE
        try {
          if (activeScene.encounterManager && typeof activeScene.encounterManager.getStats === 'function') {
            encounterStatus.activeScene.sceneStats = activeScene.encounterManager.getStats();
          }
        } catch (error) {
          encounterStatus.activeScene.sceneStatsError = error.message;
        }
      }
      
      console.log('📊 Status encounters:', encounterStatus);

      // ✅ DIAGNOSTIC AUTOMATIQUE
      console.log('🔧 === DIAGNOSTIC AUTOMATIQUE ===');
      if (!encounterStatus.encounterManagerGlobal.exists) {
        console.log('❌ EncounterManager global manquant ou null');
        console.log('💡 Solution: window.initEncounterSystem() ou window.fixEncounterSystem()');
      } else if (!encounterStatus.encounterManagerGlobal.hasGetStats) {
        console.log('❌ EncounterManager global existe mais pas de méthode getStats');
        console.log('💡 Solution: window.forceInitEncounterSystem()');
      } else {
        console.log('✅ EncounterManager global OK');
      }

      if (encounterStatus.activeScene) {
        if (!encounterStatus.activeScene.hasEncounterManager) {
          console.log('❌ Scène active sans EncounterManager');
          console.log('💡 Solution: window.initEncounterSystem(activeScene)');
        } else if (!encounterStatus.activeScene.encounterManagerSame) {
          console.log('⚠️ EncounterManager de scène différent du global');
          console.log('💡 Ceci peut être normal selon l\'architecture');
        } else {
          console.log('✅ EncounterManager de scène OK');
        }
      }
      
      return encounterStatus;
    };

    // 🆕 NOUVEAU: Fonction de debug pour le système de combat
    window.debugBattleSystem = function() {
      console.log('🔍 === DEBUG SYSTÈME DE COMBAT COMPLET ===');
      
      const battleStatus = {
        // Vérifications globales
        battleSystemGlobal: {
          exists: !!window.battleSystem,
          initialized: window.battleSystem?.isInitialized || false,
          type: typeof window.battleSystem
        },
        
        // Vérifications scène
        battleScene: {
          existsInPhaser: !!window.game?.scene?.getScene('BattleScene'),
          isActive: window.game?.scene?.isActive('BattleScene') || false,
          isVisible: window.game?.scene?.isVisible('BattleScene') || false
        },
        
        // État du combat
        battleState: {
          inBattle: window.battleSystem?.isCurrentlyInBattle() || false,
          currentState: window.battleSystem?.getCurrentBattleState() || null
        },
        
        // Fonctions disponibles
        functions: {
          initBattleSystem: typeof window.initBattleSystem,
          testBattle: typeof window.testBattle,
          startWildBattle: typeof window.startWildBattle,
          exitBattle: typeof window.exitBattle
        }
      };
      
      console.log('📊 Status système de combat:', battleStatus);
      
      return battleStatus;
    };

    window.fixTeamSystem = function() {
      console.log('🔧 === TENTATIVE DE RÉPARATION SYSTÈME D\'ÉQUIPE ===');
      
      const currentScene = window.game?.scene?.getScenes(true)[0];
      if (!currentScene) {
        console.error('❌ Aucune scène active trouvée');
        return false;
      }
      
      console.log(`🎬 Réparation sur scène: ${currentScene.scene.key}`);
      
      // 1. Force réinitialisation global
      const teamManager = window.forceInitTeamSystem();
      
      if (!teamManager) {
        console.error('❌ Échec force init global');
        return false;
      }
      
      // 2. Marquer la scène comme initialisée
      if (currentScene.teamSystemInitialized !== undefined) {
        currentScene.teamSystemInitialized = true;
        console.log('✅ Scène marquée comme team initialisée');
      }
      
      // 3. Vérifier l'icône
      setTimeout(() => {
        const teamIcon = document.querySelector('#team-icon');
        if (!teamIcon) {
          console.warn('⚠️ Icône team manquante, création...');
          // L'icône devrait se créer automatiquement avec le TeamManager
        } else {
          console.log('✅ Icône team présente');
        }
        
        // 4. Test final
        setTimeout(() => {
          window.debugTeamSystem();
          console.log('🎯 Essayez window.testTeam() pour tester');
        }, 1000);
        
              }, 500);
      
      return true;
    };

    // 🆕 NOUVEAU: Fonction de réparation pour encounters
    window.fixEncounterSystem = function() {
      console.log('🔧 === TENTATIVE DE RÉPARATION SYSTÈME D\'ENCOUNTERS ===');
      
      const currentScene = window.game?.scene?.getScenes(true)[0];
      if (!currentScene) {
        console.error('❌ Aucune scène active trouvée');
        return false;
      }
      
      console.log(`🎬 Réparation encounters sur scène: ${currentScene.scene.key}`);
      
      // 1. Force réinitialisation
      const encounterManager = window.forceInitEncounterSystem(currentScene);
      
      if (!encounterManager) {
        console.error('❌ Échec force init encounters');
        return false;
      }
      
      // 2. Test final
      setTimeout(() => {
        window.debugEncounterSystem();
        console.log('🎯 Essayez window.testEncounter() pour tester');
      }, 1000);
      
      return true;
    };

    // 🆕 NOUVEAU: Fonction de réparation pour le système de combat
    window.fixBattleSystem = function() {
      console.log('🔧 === TENTATIVE DE RÉPARATION SYSTÈME DE COMBAT ===');
      
      // 1. Nettoyer l'ancien système
      if (window.battleSystem) {
        console.log('🧹 Nettoyage ancien BattleSystem...');
        if (window.battleSystem.destroy) {
          window.battleSystem.destroy();
        }
        window.battleSystem = null;
      }
      
      // 2. Réinitialiser
      const battleSystem = window.initBattleSystem();
      
      if (battleSystem) {
        console.log('✅ Système de combat réparé !');
        
        setTimeout(() => {
          window.debugBattleSystem();
          console.log('🎯 Essayez window.testBattle() pour tester');
        }, 2000);
        
        return true;
      } else {
        console.error('❌ Échec réparation système de combat');
        return false;
      }
    };

    // ===== 4. ✅ COMMANDES RAPIDES POUR LE DEBUG =====

    window.quickTeamDebug = function() {
      console.log('⚡ === DEBUG RAPIDE TEAM ===');
      console.log('TeamManager Global:', !!window.teamManagerGlobal);
      console.log('Team Icon:', !!document.querySelector('#team-icon'));
      console.log('Init Function:', typeof window.initTeamSystem);
      console.log('Network Connected:', window.globalNetworkManager?.isConnected);
      
      const activeScene = window.game?.scene?.getScenes(true)[0];
      console.log('Scene Team Init:', activeScene?.teamSystemInitialized);
      
      if (!window.teamManagerGlobal) {
        console.log('🔧 Utilisez window.fixTeamSystem() pour réparer');
      } else {
        console.log('🎯 Utilisez window.testTeam() pour tester');
      }
    };

    // 🆕 NOUVEAU: Debug rapide encounters avec auto-fix
    window.quickEncounterDebug = function() {
      console.log('⚡ === DEBUG RAPIDE ENCOUNTERS ===');
      
      const global = !!window.encounterManagerGlobal && window.encounterManagerGlobal !== null;
      const activeScene = window.game?.scene?.getScenes(true)[0];
      const sceneManager = !!activeScene?.encounterManager;
      
      console.log('EncounterManager Global:', global);
      console.log('Scene Manager:', sceneManager);
      console.log('Scene Key:', activeScene?.scene?.key || 'N/A');
      console.log('Scene Encounter Init:', activeScene?.encounterInitialized || false);
      console.log('Init Function:', typeof window.initEncounterSystem);
      console.log('Network Connected:', window.globalNetworkManager?.isConnected);
      
      if (!global || !sceneManager) {
        console.log('🔧 Problème détecté - utilisez window.autoFixEncounters() pour réparer');
        return false;
      } else {
        console.log('🎯 Système OK - utilisez window.testEncounter() pour tester');
        return true;
      }
    };

    // 🆕 NOUVEAU: Debug rapide système de combat
    window.quickBattleDebug = function() {
      console.log('⚡ === DEBUG RAPIDE COMBAT ===');
      
      const battleSystem = !!window.battleSystem;
      const battleScene = !!window.game?.scene?.getScene('BattleScene');
      const initialized = window.battleSystem?.isInitialized || false;
      
      console.log('BattleSystem Global:', battleSystem);
      console.log('BattleScene Phaser:', battleScene);
      console.log('System Initialized:', initialized);
      console.log('Network Connected:', window.globalNetworkManager?.isConnected);
      console.log('In Battle:', window.battleSystem?.isCurrentlyInBattle() || false);
      
      if (!battleSystem || !initialized) {
        console.log('🔧 Problème détecté - utilisez window.fixBattleSystem() pour réparer');
        return false;
      } else {
        console.log('🎯 Système OK - utilisez window.testBattle() pour tester');
        return true;
      }
    };

    // 🆕 NOUVEAU: Fonction de réparation automatique
    window.autoFixEncounters = function() {
      console.log('🔧 === RÉPARATION AUTOMATIQUE ENCOUNTERS ===');
      
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        console.error('❌ Aucune scène active');
        return false;
      }
      
      console.log(`🎬 Réparation sur scène: ${activeScene.scene.key}`);
      
      // 1. Nettoyer complètement
      console.log('🧹 Nettoyage complet...');
      window.encounterManagerGlobal = null;
      if (activeScene.encounterManager) {
        activeScene.encounterManager = null;
        activeScene.encounterInitialized = false;
      }
      
      // 2. Réinitialiser
      console.log('🚀 Réinitialisation...');
      const result = window.initEncounterSystem(activeScene);
      
      if (result) {
        console.log('✅ Réparation réussie !');
        
        // 3. Test automatique
        setTimeout(() => {
          const testResult = window.quickEncounterDebug();
          if (testResult) {
            console.log('🎯 Système validé - prêt à utiliser !');
            window.showGameNotification?.('Système encounters réparé !', 'success', { 
              duration: 2000, 
              position: 'top-center' 
            });
          }
        }, 500);
        
        return true;
      } else {
        console.error('❌ Échec de réparation');
        window.showGameNotification?.('Échec réparation encounters', 'error', { 
          duration: 2000, 
          position: 'top-center' 
        });
        return false;
      }
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
    
    // ✅ MÉTHODE MODIFIÉE: Inclure l'initialisation des encounters et du combat
    window.initAllGameSystems = function(scene, gameRoom) {
      const roomToUse = gameRoom || window.currentGameRoom;
      
      // Initialiser dans l'ordre correct
      const inventory = window.initInventorySystem(roomToUse);
      const quests = window.initQuestSystem(scene, roomToUse);
      const starter = window.initStarterHUD(roomToUse);
      
      // ✅ ATTENDRE un peu avant d'initialiser l'équipe
      setTimeout(() => {
        const team = window.initTeamSystem(roomToUse);
        
        // 🆕 NOUVEAU: Initialiser les encounters après un délai
        setTimeout(() => {
          const encounters = window.initEncounterSystem(scene);
          
          // 🆕 NOUVEAU: Initialiser le système de combat
          setTimeout(() => {
            const battle = window.initBattleSystem(roomToUse);
            
            // Initialiser le système de positionnement global après tout
            setTimeout(() => {
              if (typeof window.initUIIconPositioning === 'function') {
                window.initUIIconPositioning();
              }
              window.onSystemInitialized && window.onSystemInitialized('all');
            }, 500);
            
            return { inventory, quests, starter, team, encounters, battle };
          }, 500);
          
        }, 500);
        
      }, 1000); // ✅ 1 seconde de délai
    };

    // === FONCTIONS DE DEBUG POUR LES ICÔNES ===
    window.debugUIIcons = function() {
      console.log('🔍 === DEBUG UI ICONS ===');
      
      const icons = {
        inventory: document.querySelector('#inventory-icon'),
        quest: document.querySelector('#quest-icon'),
        team: document.querySelector('#team-icon')
      };
      
      Object.entries(icons).forEach(([name, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          console.log(`${name.toUpperCase()}:`, {
            exists: true,
            position: {
              bottom: style.bottom,
              right: style.right,
              actual: { x: rect.right, y: window.innerHeight - rect.bottom }
            },
            classes: Array.from(element.classList),
            visible: style.display !== 'none' && style.visibility !== 'hidden'
          });
        } else {
          console.log(`${name.toUpperCase()}: Non trouvée`);
        }
      });
    };

    window.fixIconPositions = function() {
      console.log('🔧 Correction des positions d\'icônes...');
      
      const inventory = document.querySelector('#inventory-icon');
      const quest = document.querySelector('#quest-icon');
      const team = document.querySelector('#team-icon');
      
      if (inventory) {
        inventory.style.right = '20px';
        inventory.style.bottom = '20px';
      }
      
      if (quest) {
        quest.style.right = '110px';
        quest.style.bottom = '20px';
      }
      
      if (team) {
        team.style.right = '200px';
        team.style.bottom = '20px';
      }
      
      console.log('✅ Positions corrigées manuellement');
      setTimeout(() => window.debugUIIcons(), 100);
    };

    window.testTeamIcon = function() {
      const teamIcon = document.querySelector('#team-icon');
      if (teamIcon) {
        console.log('⚔️ Test de l\'icône team...');
        teamIcon.click();
        
        setTimeout(() => {
          teamIcon.classList.add('team-updated');
          setTimeout(() => teamIcon.classList.remove('team-updated'), 600);
        }, 1000);
        
        console.log('✅ Test terminé');
      } else {
        console.error('❌ Icône team non trouvée');
      }
    };

    
    // === Fonctions d'accès rapide, notifications, tests etc ===
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
    // === FONCTIONS STARTER SYSTEM ===
// ✅ FONCTION DE TEST POUR STARTER SELECTION
window.testStarterSelection = function() {
  console.log("🧪 Test du système de sélection de starter...");
  return StarterUtils.test();
};

window.showStarterSelection = function(availableStarters = null) {
  return StarterUtils.showSelection(availableStarters);
};

window.hideStarterSelection = function() {
  StarterUtils.hideSelection();
};

window.isStarterSelectionActive = function() {
  return StarterUtils.isActive();
};

    // Ajoute cette fonction après window.isStarterSelectionActive()
window.debugStarterSelection = function() {
  console.log("🔍 Debug du système de starter...");
  const activeScene = window.game?.scene?.getScenes(true)[0];
  
  if (activeScene) {
    console.log("Scène active:", {
      key: activeScene.scene.key,
      hasShowFunction: typeof activeScene.showStarterSelection === 'function',
      isActive: activeScene.isStarterSelectionActive?.() || false
    });
  }
  
  console.log("StarterUtils disponible:", typeof StarterUtils === 'object');
  console.log("Fonction test:", typeof StarterUtils.test === 'function');
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

    window.openTeam = function() {
      if (window.teamManagerGlobal) {
        window.teamManagerGlobal.openTeamUI();
        window.showGameNotification("Équipe ouverte", "info", { duration: 1500, position: 'bottom-right' });
      } else {
        window.showGameAlert?.("Système d'équipe non initialisé");
      }
    };

    window.toggleTeam = function() {
      if (window.teamManagerGlobal) {
        const wasOpen = window.teamManagerGlobal.teamUI?.isOpen();
        window.teamManagerGlobal.toggleTeamUI();
        if (!wasOpen) {
          window.showGameNotification("Équipe ouverte", "info", { duration: 1000, position: 'bottom-right' });
        }
      } else {
        window.showGameAlert?.("Aucun système d'équipe disponible");
      }
    };

    window.testTeam = function() {
      if (window.teamManagerGlobal) {
        window.teamManagerGlobal.toggleTeamUI();
        setTimeout(() => {
          window.showGameNotification("Test d'équipe réussi !", "success", { duration: 2000, position: 'top-center' });
        }, 500);
      } else {
        window.showGameAlert?.("Système d'équipe non initialisé");
      }
    };

    // 🆕 NOUVELLES FONCTIONS DE TEST POUR LES ENCOUNTERS
    window.testEncounter = function() {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        window.showGameAlert?.("Aucune scène active");
        return;
      }

      if (activeScene.encounterManager) {
        const myPlayer = activeScene.playerManager?.getMyPlayer();
        if (myPlayer) {
          const result = activeScene.encounterManager.forceEncounterCheck(myPlayer.x, myPlayer.y);
          console.log("🧪 Test encounter résultat:", result);
          window.showGameNotification("Test encounter dans la console", "info", { duration: 2000, position: 'top-center' });
        } else {
          window.showGameAlert?.("Pas de joueur trouvé");
        }
      } else {
        window.showGameAlert?.("Système d'encounters non initialisé");
      }
    };

    window.debugEncounters = function() {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        console.log("❌ Aucune scène active");
        return;
      }

      if (activeScene.debugEncounters) {
        activeScene.debugEncounters();
      } else {
        console.log("❌ Fonction debugEncounters non disponible sur la scène");
      }
    };

    window.forceEncounter = function() {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        window.showGameAlert?.("Aucune scène active");
        return;
      }

      if (activeScene.forceEncounterTest) {
        activeScene.forceEncounterTest();
      } else {
        window.showGameAlert?.("Fonction forceEncounter non disponible sur cette scène");
      }
    };

    window.resetEncounterCooldowns = function() {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        window.showGameAlert?.("Aucune scène active");
        return;
      }

      if (activeScene.resetEncounterCooldowns) {
        activeScene.resetEncounterCooldowns();
      } else if (window.encounterManagerGlobal) {
        window.encounterManagerGlobal.resetCooldowns();
        window.showGameNotification("Cooldowns encounters reset", "info", { duration: 1500, position: 'bottom-center' });
      } else {
        window.showGameAlert?.("Système d'encounters non initialisé");
      }
    };

    window.simulateEncounterSteps = function(count = 5) {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        window.showGameAlert?.("Aucune scène active");
        return;
      }

      if (activeScene.simulateEncounterSteps) {
        activeScene.simulateEncounterSteps(count);
      } else if (window.encounterManagerGlobal) {
        window.encounterManagerGlobal.simulateSteps(count);
        window.showGameNotification(`${count} pas simulés`, "info", { duration: 1500, position: 'bottom-center' });
      } else {
        window.showGameAlert?.("Système d'encounters non initialisé");
      }
    };

    window.getCurrentEncounterInfo = function() {
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        console.log("❌ Aucune scène active");
        return null;
      }

      if (activeScene.getCurrentEncounterInfo) {
        return activeScene.getCurrentEncounterInfo();
      } else {
        console.log("❌ Fonction getCurrentEncounterInfo non disponible");
        return null;
      }
    };

    // 🆕 NOUVELLES FONCTIONS DE TEST POUR LE SYSTÈME DE COMBAT
    window.testBattle = function() {
      if (!window.battleSystem) {
        window.showGameAlert?.("Système de combat non initialisé");
        console.log("❌ Utilisez window.initBattleSystem() pour l'initialiser");
        return;
      }

      if (!window.battleSystem.isInitialized) {
        window.showGameAlert?.("Système de combat pas encore prêt");
        console.log("⏳ Système en cours d'initialisation...");
        return;
      }

      console.log("🧪 Test du système de combat...");
      
      const result = window.battleSystem.testBattle();
      if (result) {
        window.showGameNotification("Test de combat lancé !", "info", { duration: 2000, position: 'top-center' });
        console.log("✅ Combat de test démarré");
      } else {
        window.showGameAlert?.("Échec du test de combat");
        console.log("❌ Échec du test de combat");
      }
    };

    window.startWildBattle = function(pokemonData = null) {
      if (!window.battleSystem) {
        window.showGameAlert?.("Système de combat non initialisé");
        return false;
      }

      const testPokemon = pokemonData || {
        pokemonId: 25, // Pikachu
        level: 5,
        name: 'Pikachu',
        shiny: false,
        gender: 'male'
      };

      console.log("⚔️ Démarrage combat sauvage:", testPokemon);
      
      const result = window.battleSystem.startWildBattle({
        pokemon: testPokemon,
        location: 'test_zone',
        method: 'manual'
      });

      if (result) {
        window.showGameNotification("Combat sauvage démarré !", "info", { duration: 2000, position: 'top-center' });
        console.log("✅ Combat sauvage lancé");
      } else {
        window.showGameAlert?.("Impossible de démarrer le combat");
        console.log("❌ Échec démarrage combat");
      }

      return result;
    };

    window.exitBattle = function() {
      if (!window.battleSystem) {
        window.showGameAlert?.("Aucun système de combat");
        return false;
      }

      if (!window.battleSystem.isCurrentlyInBattle()) {
        window.showGameAlert?.("Pas en combat actuellement");
        return false;
      }

      console.log("🚪 Sortie de combat...");
      
      const result = window.battleSystem.exitBattle('manual');
      if (result) {
        window.showGameNotification("Combat quitté", "info", { duration: 1500, position: 'top-center' });
        console.log("✅ Combat quitté avec succès");
      }

      return result;
    };

    window.getBattleStatus = function() {
      if (!window.battleSystem) {
        console.log("❌ Système de combat non disponible");
        return null;
      }

      const status = window.battleSystem.getCurrentBattleState();
      console.log("⚔️ État du combat:", status);
      
      return status;
    };

    window.debugBattleConnection = function() {
      if (!window.battleSystem?.battleConnection) {
        console.log("❌ BattleConnection non disponible");
        return null;
      }

      console.log("🔍 Debug BattleConnection...");
      window.battleSystem.battleConnection.debugConnections();
      
      return window.battleSystem.battleConnection.getConnectionStatus();
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
    console.log("⚔️ Utilisez 'T' pour ouvrir l'équipe en jeu");
    console.log("🎲 Utilisez 'F' pour debug encounters en jeu");
    console.log("🎲 Utilisez 'G' pour forcer un encounter en jeu");
    console.log("⚔️ Utilisez 'B' pour tester le système de combat en jeu");
    console.log("🎮 Utilisez window.initAllGameSystems(scene, gameRoom) dans vos scènes pour tout initialiser");
    console.log("🌍 Utilisez window.listAvailableZones() pour voir les zones disponibles");
    console.log("🔄 Utilisez window.testTransition('village') pour tester les transitions");
    console.log("⚔️ Utilisez window.testBattle() pour tester le système de combat");
    
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

window.isTeamOpen = function() {
  return window.teamManagerGlobal ? window.teamManagerGlobal.teamUI?.isOpen() || false : false;
};

// 🆕 NOUVEAU: Fonction pour vérifier si un encounter est en cours
window.isEncounterActive = function() {
  const activeScene = window.game?.scene?.getScenes(true)[0];
  return activeScene?.encounterActive || false;
};

// 🆕 NOUVEAU: Fonction pour vérifier si un combat est en cours
window.isBattleActive = function() {
  return window.battleSystem?.isCurrentlyInBattle() || false;
};

window.shouldBlockInput = function() {
  return window.isChatFocused() ||
    window.isStarterHUDOpen() ||
    window.isQuestJournalOpen() ||
    window.isInventoryOpen() ||
    window.isTeamOpen() ||
    window.isEncounterActive() || // 🆕 NOUVEAU: Bloquer aussi pendant encounters
    window.isBattleActive() || // 🆕 NOUVEAU: Bloquer pendant combat
    window.isStarterSelectionActive(); // ← AJOUTER CETTE LIGNE

};

window.canPlayerInteract = function() {
  if (window.inventorySystemGlobal) return window.inventorySystemGlobal.canPlayerInteract();
  if (window.questSystemGlobal) return window.questSystemGlobal.canPlayerInteract();
  return !window.shouldBlockInput();
};

// ✅ FONCTION DEBUG AMÉLIORÉE AVEC ENCOUNTERS ET COMBAT
window.getGameSystemsStatus = function() {
  const status = {
    chat: { initialized: !!window.pokeChat, focused: window.isChatFocused() },
    inventory: { initialized: !!window.inventorySystemGlobal, open: window.isInventoryOpen() },
    quests: { initialized: !!window.questSystemGlobal, journalOpen: window.isQuestJournalOpen() },
    starter: { initialized: !!window.starterHUD, open: window.isStarterHUDOpen() },
    team: { initialized: !!window.teamManagerGlobal, open: window.isTeamOpen() },
    // 🆕 NOUVEAU: Status encounters
    encounters: { 
      initialized: !!window.encounterManagerGlobal, 
      active: window.isEncounterActive(),
      globalManager: !!window.encounterManagerGlobal,
      sceneManager: !!window.game?.scene?.getScenes(true)[0]?.encounterManager
    },
    // 🆕 NOUVEAU: Status combat
    battle: {
      initialized: !!window.battleSystem,
      systemReady: window.battleSystem?.isInitialized || false,
      inBattle: window.isBattleActive(),
      sceneExists: !!window.game?.scene?.getScene('BattleScene')
    },
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
    starter: { 
    initialized: !!window.starterSelector, 
    active: window.isStarterSelectionActive?.() || false,
    utils: typeof StarterUtils === 'object'
    },
    // ✅ Info du SceneRegistry
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

  // 🆕 NOUVEAU: DEBUG ENCOUNTER SYSTEM
  if (window.encounterManagerGlobal) {
    console.log("🎲 Debug EncounterManager:");
    window.debugEncounterSystem();
  } else {
    console.log("❌ EncounterManager global introuvable");
  }

  // 🆕 NOUVEAU: DEBUG BATTLE SYSTEM
  if (window.battleSystem) {
    console.log("⚔️ Debug BattleSystem:");
    window.debugBattleSystem();
  } else {
    console.log("❌ BattleSystem global introuvable");
  }
  
  return status;
};

window.quickTestNotifications = function() {
  console.log("🧪 Test rapide des notifications...");
  window.testNotifications?.();
};

// ✅ AIDE AMÉLIORÉE AVEC ENCOUNTERS ET COMBAT
window.showGameHelp = function() {
  window.showGameNotification?.("Aide affichée dans la console", "info", { duration: 3000, position: 'top-center' });
  console.log(`
🎮 === AIDE DU JEU ===

=== Contrôles de base ===
• I - Ouvrir/Fermer l'inventaire
• T - Ouvrir/Fermer l'équipe
• Q - Ouvrir/Fermer le journal des quêtes
• F - Debug encounters (dans les zones)
• G - Forcer un encounter (dans les zones)
• B - Tester le système de combat
• E - Interagir avec NPCs/objets
• S - Afficher sélection starter (test)
• ESC - Fermer sélection starter
• WASD ou Flèches - Déplacement

=== Fonctions de test ===
• window.testInventory() - Tester l'inventaire
• window.testTeam() - Tester l'équipe
• window.testEncounter() - Tester les encounters
• window.testBattle() - Tester le système de combat
• window.testNotifications() - Tester les notifications
• window.quickTestNotifications() - Test rapide
• window.debugGameSystems() - Debug des systèmes

=== Fonctions encounters ===
• window.debugEncounters() - Debug encounters
• window.forceEncounter() - Forcer un encounter
• window.resetEncounterCooldowns() - Reset cooldowns
• window.simulateEncounterSteps(5) - Simuler des pas
• window.getCurrentEncounterInfo() - Info position actuelle
• window.quickEncounterDebug() - Debug rapide encounters

=== Fonctions combat (NOUVEAU) ===
• window.testBattle() - Test complet du système
• window.startWildBattle() - Démarrer combat sauvage
• window.exitBattle() - Quitter combat en cours
• window.getBattleStatus() - État du combat actuel
• window.debugBattleSystem() - Debug système complet
• window.debugBattleConnection() - Debug connexions
• window.quickBattleDebug() - Debug rapide combat

=== Fonctions de transition ===
• window.testTransition('village') - Test transition vers village
• window.forceTransition('beach') - Forcer transition
• window.listAvailableZones() - Lister zones disponibles
• window.switchToZone('road1') - Changer de zone manuellement
• window.debugSceneRegistry() - Debug du système de scènes

=== Starter fonctions ===
• window.testStarterSelection() - Tester la sélection de starter
• window.debugStarterSelection() - Debug du système starter

=== Systèmes disponibles ===
• Inventaire: ${!!window.inventorySystemGlobal}
• Équipe: ${!!window.teamManagerGlobal}
• Quêtes: ${!!window.questSystemGlobal}
• Encounters: ${!!window.encounterManagerGlobal}
• Combat: ${!!window.battleSystem} (prêt: ${window.battleSystem?.isInitialized || false})
• Notifications: ${!!window.gameNotificationSystem}
• Starter HUD: ${!!window.starterHUD}
• NetworkManager: ${!!window.globalNetworkManager} (connecté: ${window.globalNetworkManager?.isConnected})
• SceneRegistry: ${!!window.sceneRegistry} (zones: ${window.sceneRegistry?.getAvailableZones().length || 0})

=== Pour les développeurs ===
• window.showNotificationInstructions() - Instructions complètes
• window.debugNotificationSystem() - Debug notifications
• window.debugEncounterSystem() - Debug encounters complet
• window.debugBattleSystem() - Debug combat complet
• window.getGameSystemsStatus() - Statut des systèmes
• window.restartCurrentZone() - Redémarrer la zone actuelle
• window.fixEncounterSystem() - Réparer system encounters
• window.fixBattleSystem() - Réparer système combat
========================
  `);
};

console.log(`
🎉 === POKÉMON MMO PRÊT ===
Utilisez window.showGameHelp() pour l'aide complète
Tous les systèmes sont initialisés et prêts !
🔄 Support des transitions robustes intégré !
⚔️ Système d'équipe Pokémon disponible !
🎲 Système d'encounters Pokémon intégré !
⚔️ Système de combat MMO Pokémon intégré !
==============================
`);

// ✅ FONCTIONS DE TEST MÉTÉO GLOBAL
window.quickWeatherDebug = function() {
  console.log('⚡ === DEBUG RAPIDE MÉTÉO ===');
  console.log('Global Manager:', !!window.weatherManagerGlobal);
  console.log('Initialized:', window.weatherManagerGlobal?.isInitialized);
  console.log('Active Scenes:', window.game?.scene?.getScenes(true)?.length || 0);
  
  if (!window.weatherManagerGlobal || !window.weatherManagerGlobal.isInitialized) {
    console.log('🔧 Problème détecté - système météo pas prêt');
  } else {
    console.log('✅ Système météo global OK');
  }
};

window.testGlobalWeather = function() {
  if (!window.weatherManagerGlobal?.isInitialized) {
    console.error('❌ Système météo global pas prêt');
    return false;
  }
  
  const currentTime = window.getGlobalTime();
  const currentWeather = window.getGlobalWeather();
  
  console.log('⏰ Temps actuel:', currentTime);
  console.log('🌦️ Météo actuelle:', currentWeather);
  
  return true;
};
