import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { setupTeamSystem } from './integration/teamIntegration.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { DayNightWeatherManagerPhaser } from './game/DayNightWeatherManager.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { ClientTimeWeatherManager } from './managers/ClientTimeWeatherManager.js';

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

// === Import du debug de notifications ===
import './debug-notifications.js';

// 🆕 NOUVEAU: Import du ClientEncounterManager
import { ClientEncounterManager } from './managers/EncounterManager.js';

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
    
    // ✅ MÉTHODE MODIFIÉE: Inclure l'initialisation des encounters
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
          
          // Initialiser le système de positionnement global après tout
          setTimeout(() => {
            if (typeof window.initUIIconPositioning === 'function') {
              window.initUIIconPositioning();
            }
            window.onSystemInitialized && window.onSystemInitialized('all');
          }, 500);
          
          return { inventory, quests, starter, team, encounters };
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

window.shouldBlockInput = function() {
  return window.isChatFocused() ||
    window.isStarterHUDOpen() ||
    window.isQuestJournalOpen() ||
    window.isInventoryOpen() ||
    window.isTeamOpen() ||
    window.isEncounterActive(); // 🆕 NOUVEAU: Bloquer aussi pendant encounters
};

window.canPlayerInteract = function() {
  if (window.inventorySystemGlobal) return window.inventorySystemGlobal.canPlayerInteract();
  if (window.questSystemGlobal) return window.questSystemGlobal.canPlayerInteract();
  return !window.shouldBlockInput();
};

// ✅ FONCTION DEBUG AMÉLIORÉE AVEC ENCOUNTERS
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
  
  return status;
};

window.quickTestNotifications = function() {
  console.log("🧪 Test rapide des notifications...");
  window.testNotifications?.();
};

// ✅ AIDE AMÉLIORÉE AVEC ENCOUNTERS
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
• E - Interagir avec NPCs/objets
• WASD ou Flèches - Déplacement

=== Fonctions de test ===
• window.testInventory() - Tester l'inventaire
• window.testTeam() - Tester l'équipe
• window.testEncounter() - Tester les encounters
• window.testNotifications() - Tester les notifications
• window.quickTestNotifications() - Test rapide
• window.debugGameSystems() - Debug des systèmes

=== Fonctions encounters (NOUVEAU) ===
• window.debugEncounters() - Debug encounters
• window.forceEncounter() - Forcer un encounter
• window.resetEncounterCooldowns() - Reset cooldowns
• window.simulateEncounterSteps(5) - Simuler des pas
• window.getCurrentEncounterInfo() - Info position actuelle
• window.quickEncounterDebug() - Debug rapide encounters

=== Fonctions de transition ===
• window.testTransition('village') - Test transition vers village
• window.forceTransition('beach') - Forcer transition
• window.listAvailableZones() - Lister zones disponibles
• window.switchToZone('road1') - Changer de zone manuellement
• window.debugSceneRegistry() - Debug du système de scènes

=== Systèmes disponibles ===
• Inventaire: ${!!window.inventorySystemGlobal}
• Équipe: ${!!window.teamManagerGlobal}
• Quêtes: ${!!window.questSystemGlobal}
• Encounters: ${!!window.encounterManagerGlobal}
• Notifications: ${!!window.gameNotificationSystem}
• Starter HUD: ${!!window.starterHUD}
• NetworkManager: ${!!window.globalNetworkManager} (connecté: ${window.globalNetworkManager?.isConnected})
• SceneRegistry: ${!!window.sceneRegistry} (zones: ${window.sceneRegistry?.getAvailableZones().length || 0})

=== Pour les développeurs ===
• window.showNotificationInstructions() - Instructions complètes
• window.debugNotificationSystem() - Debug notifications
• window.debugEncounterSystem() - Debug encounters complet
• window.getGameSystemsStatus() - Statut des systèmes
• window.restartCurrentZone() - Redémarrer la zone actuelle
• window.fixEncounterSystem() - Réparer system encounters
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
