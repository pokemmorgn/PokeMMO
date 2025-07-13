import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { LoadingScreen, QuickLoading } from './components/LoadingScreen.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { DayNightWeatherManagerPhaser } from './game/DayNightWeatherManager.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { ClientTimeWeatherManager } from './managers/ClientTimeWeatherManager.js';
import { StarterUtils, integrateStarterSelectorToScene } from './components/StarterSelector.js';
import { BattleUITransition } from './Battle/BattleUITransition.js';

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
import { Road1HouseScene } from './scenes/zones/Road1HouseScene.js';
import { Road1HiddenScene } from './scenes/zones/Road1HiddenScene.js';
import { Road2Scene } from './scenes/zones/Road2Scene.js';
import { Road3Scene } from './scenes/zones/Road3Scene.js';
import { VillageFloristScene } from './scenes/zones/VillageFloristScene.js';
import { VillageHouse2Scene } from './scenes/zones/VillageHouse2Scene.js';
import { VillageWindmillScene } from './scenes/zones/VillageWindmillScene.js';
import { NoctherbCave1Scene } from './scenes/zones/NoctherbCave1Scene.js';
import { NoctherbCave2Scene } from './scenes/zones/NoctherbCave2Scene.js';
import { NoctherbCave2BisScene } from './scenes/zones/NoctherbCave2BisScene.js';
import { WraithmoorScene } from './scenes/zones/WraithmoorScene.js';
import { WraithmoorCimeteryScene } from './scenes/zones/WraithmoorCimeteryScene.js';
import { WraithmoorManor1Scene } from './scenes/zones/WraithmoorManor1Scene.js';

import { Client } from 'colyseus.js';
import { initPokeChat } from './network/PokeChatSystem.js';
import { StarterSelectionHUD } from './components/StarterSelectionHUD.js';
import { InventorySystem } from './game/InventorySystem.js';
import { initializeGameNotifications, showNotificationInstructions } from './notification.js';
import { PsyduckIntroManager } from './scenes/intros/PsyduckIntroManager.js';
import { initializePokemonUI } from './ui.js';
import './debug-notifications.js';
import { ClientEncounterManager } from './managers/EncounterManager.js';
import { BattleIntegration } from './managers/BattleIntegration.js';
import { BattleScene } from './scenes/BattleScene.js';

const ENDPOINT =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.hostname +
  (location.port ? ":" + location.port : "") +
  "/ws";

const client = new Client(ENDPOINT);
window.client = client;
console.log("✅ Client Colyseus exposé globalement");
// Ajoutez ceci au début de main.js, après les imports mais avant la fonction getSecureUserSession

// ✅ Configuration globale - wallet optionnelle
window.gameConfig = {
  requireWallet: false,           // Wallet pas obligatoire
  skipWalletChecks: true,         // Ignorer les vérifications wallet
  enableWalletFeatures: true,     // Garder les fonctionnalités wallet
  walletOptional: true            // Mode optionnel
};

console.log('✅ Configuration wallet optionnelle activée');
// ✅ NOUVEAU SYSTÈME DE SESSION SÉCURISÉE
// Remplacez la fonction getSecureUserSession dans main.js

function getSecureUserSession() {
  const encryptedSession = sessionStorage.getItem('pws_game_session');
  
  if (!encryptedSession) {
    console.warn('❌ Aucune session de jeu trouvée');
    alert('Veuillez vous connecter pour jouer');
    window.location.href = '/auth';
    return null;
  }

  try {
    const key = sessionStorage.getItem('pws_key');
    if (!key) {
      console.warn('❌ Clé de session manquante');
      throw new Error('Session key missing');
    }
    
    const decoded = atob(encryptedSession);
    const [dataStr, sessionKey] = decoded.split('|');
    
    if (sessionKey !== key) {
      console.warn('❌ Clé de session invalide');
      throw new Error('Invalid session key');
    }
    
    const sessionData = JSON.parse(dataStr);
    
    if (!sessionData.username) {
      console.warn('❌ Username manquant dans la session');
      throw new Error('No username in session');
    }
    
    // ✅ SUPPRIMÉ: Vérification expiration trop stricte
    // Laisser le serveur gérer l'expiration du JWT
    
    console.log('✅ Session de jeu valide pour:', sessionData.username);
    return sessionData;
    
  } catch (error) {
    console.error('❌ Erreur lecture session:', error);
    alert('Session invalide. Reconnexion requise.');
    
    // ✅ Nettoyer les sessions corrompues
    sessionStorage.removeItem('pws_game_session');
    sessionStorage.removeItem('pws_key');
    
    window.location.href = '/auth';
    return null;
  }
}
// Récupérer l'utilisateur sécurisé
const userSession = getSecureUserSession();
if (!userSession) {
  throw new Error("Session invalide");
}

const username = userSession.username;
window.username = username;

async function initializeSceneSystem() {
  console.log("🏗️ [MAIN] === INITIALISATION SYSTÈME DE SCÈNES ===");
  
  const registry = SceneRegistry.getInstance();
  
  console.log("📝 [MAIN] Enregistrement des classes de scènes...");
  registry.registerSceneClass('beach', BeachScene);
  registry.registerSceneClass('village', VillageScene);
  registry.registerSceneClass('villagelab', VillageLabScene);
  registry.registerSceneClass('road1', Road1Scene);
  registry.registerSceneClass('villagehouse1', VillageHouse1Scene);
  registry.registerSceneClass('lavandia', LavandiaScene);
  
  console.log("✅ [MAIN] Toutes les scènes enregistrées dans le registry");
  
  window.sceneRegistry = registry;
  
  window.switchToZone = async function(zoneName, transitionData = {}) {
    const sceneKey = registry.getSceneKey(zoneName);
    console.log(`🔄 [MAIN] Changement vers zone: ${zoneName} (${sceneKey})`);
    
    const targetScene = window.game.scene.getScene(sceneKey);
    if (!targetScene) {
      console.error(`❌ [MAIN] Scène ${sceneKey} introuvable`);
      return false;
    }
    
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
    
    const phaserScenes = Object.keys(window.game?.scene?.manager?.keys || {});
    console.log(`🎬 Scènes Phaser:`, phaserScenes);
    
    return {
      registryZones: registry.getAvailableZones(),
      phaserScenes: phaserScenes
    };
  };
  
  return registry;
}

window.fixBattleClient = function() {
  console.log('🔧 === CORRECTION CLIENT BATTLE ===');
  
  if (!window.client) {
    console.error('❌ Client Colyseus global manquant');
    return false;
  }
  
  if (!window.battleSystem) {
    console.warn('⚠️ BattleSystem pas encore initialisé (normal au chargement)');
    return false;
  }
  
  const battleConnection = window.battleSystem.battleConnection;
  const networkHandler = battleConnection?.networkHandler;
  
  if (networkHandler) {
    console.log('🔄 Correction du client dans BattleNetworkHandler...');
    
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

async function initializeGlobalWeatherSystem() {
  console.log("🌤️ [MAIN] === INITIALISATION SYSTÈME MÉTÉO GLOBAL SIMPLE ===");
  
  try {
    console.log("🌍 [MAIN] Initialisation GlobalWeatherManager...");
    const success = await globalWeatherManager.initialize(window.globalNetworkManager);
    
    if (success) {
      console.log("✅ [MAIN] GlobalWeatherManager initialisé avec succès");
      
      window.globalWeatherManager = globalWeatherManager;
      window.weatherManagerGlobal = globalWeatherManager;
      
      window.getGlobalWeather = function() {
        return globalWeatherManager.getCurrentWeather();
      };
      
      window.getGlobalTime = function() {
        return globalWeatherManager.getCurrentTime();
      };
      
      window.registerSceneToWeather = function(scene, zoneName) {
        if (!globalWeatherManager.isInitialized) {
          console.warn("⚠️ [GLOBAL] Système météo pas prêt pour enregistrement");
          return false;
        }
        
        console.log(`🌤️ [GLOBAL] Enregistrement scène météo: ${scene.scene.key} (zone: ${zoneName})`);
        return globalWeatherManager.registerScene(scene, zoneName);
      };
      
      window.onWeatherZoneChanged = function(zoneName) {
        globalWeatherManager.onZoneChanged(zoneName);
      };
      
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
  
  window.forceWeatherUpdate();
  
  return true;
};

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  pauseOnBlur: false,
  scene: [
    LoaderScene,
    VillageScene,
    VillageLabScene,
    VillageHouse1Scene,
    VillageHouse2Scene,
    VillageFloristScene,
    VillageWindmillScene,
    BeachScene,
    Road1Scene,
    Road1HouseScene,
    Road1HiddenScene,
    Road2Scene,
    Road3Scene,
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
    NoctherbCave1Scene,
    NoctherbCave2Scene,
    NoctherbCave2BisScene,
    WraithmoorScene,
    WraithmoorManor1Scene,
    WraithmoorCimeteryScene,
    { scene: BattleScene, active: false, visible: false }
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

(async () => {
  try {
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Système de notification initialisé");
    
    console.log("🌐 Création et connexion du NetworkManager global...");
    window.globalNetworkManager = new NetworkManager(client, window.username);
    
// ✅ Passer les données de session au NetworkManager
const connectionSuccess = await window.globalNetworkManager.connect("beach", {
  spawnX: 360,
  spawnY: 120,
  username: username,
  sessionToken: userSession.sessionToken,  // ✅ Passer le token
  permissions: userSession.permissions || ['play']
});

// ✅ NOUVEAU: Démarrer heartbeat pour tracker le playtime
if (connectionSuccess && window.currentGameRoom) {
  console.log("⏰ Démarrage heartbeat playtime...");
  
  setInterval(() => {
    if (window.currentGameRoom && window.currentGameRoom.connection.isOpen) {
      window.currentGameRoom.send("ping", { timestamp: Date.now() });
    }
  }, 30000); // Toutes les 30 secondes
  
  console.log("✅ Heartbeat playtime configuré (30s)");
}

if (!connectionSuccess) {
  console.error("❌ Échec de connexion à la WorldRoom");
  alert("Impossible de se connecter au monde du jeu. Veuillez réessayer.");
  window.location.href = '/auth';
  throw new Error("Échec de connexion à la WorldRoom via NetworkManager");
}
    
    window.currentGameRoom = window.globalNetworkManager.room;
    console.log("✅ Connecté à la WorldRoom via NetworkManager:", window.currentGameRoom.sessionId);
    
    console.log("🕐 Connexion du TimeService au serveur...");
    TimeService.getInstance().connectToRoom(window.currentGameRoom);

    console.log("🔍 [DEBUG] SessionId après connexion:");
    console.log("- NetworkManager sessionId:", window.globalNetworkManager.getSessionId());
    console.log("- Room sessionId:", window.globalNetworkManager.room?.sessionId);
    console.log("- Room existe:", !!window.globalNetworkManager.room);
    console.log("- NetworkManager connecté:", window.globalNetworkManager.isConnected);

    console.log("🌤️ Initialisation du système météo global...");
    await initializeGlobalWeatherSystem();
    console.log("✅ Système météo global initialisé");
    
    console.log("🏗️ Initialisation du système de scènes...");
    const sceneRegistry = await initializeSceneSystem();
    console.log("✅ Système de scènes initialisé");
    
    console.log("💬 Connexion à la WorldChatRoom...");
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    console.log("✅ Connecté à la WorldChatRoom");

    initPokeChat(worldChat, window.username);

    console.log("🎮 Lancement de Phaser avec chargement étendu...");

    window.extendedLoadingScreen = LoadingScreen.createGlobal({
      enabled: true,
      fastMode: false,
      theme: 'extended'
    });

    window.extendedLoadingScreen.addCustomTheme('extended', {
      title: 'PokeWorld MMO',
      steps: [
        "Booting up the Pokédex OS...",
        "Syncing with Professor Oak's Wi-Fi...",
        "Waking up Pikachu (please wait, he's grumpy)...",
        "Sprinkling wild grass and hiding rare candies...",
        "Unpacking your Pokéballs & fresh running shoes...",
        "Calling Nurse Joy for your starter checkup...",
        "Polishing badges (don't eat the Marsh Badge)...",
        "Initializing quest logs and Team Rocket traps...",
        "Final tip from your Mom: 'Don't forget your hat!'",
        "Welcome to PokeWorld! Press START to begin your journey!"
      ],
      icon: '🌍',
      color: 'rgba(34, 197, 94, 0.8)',
      stepDelay: 800
    });

    async function startExtendedLoading() {
      try {
        console.log("🚀 Démarrage chargement étendu...");
        
        window.extendedLoadingScreen.show('extended');
        
        setTimeout(() => {
          console.log("🎮 Lancement Phaser en arrière-plan...");
          window.game = new Phaser.Game(config);
        }, 1000);
        
        console.log("✅ Chargement étendu lancé - l'écran va se gérer automatiquement");
        
      } catch (error) {
        console.error("❌ Erreur chargement étendu:", error);
        if (window.extendedLoadingScreen) {
          window.extendedLoadingScreen.hide();
        }
        window.game = new Phaser.Game(config);
      }
    }

    startExtendedLoading();

    document.addEventListener('click', function resumeAudioContext() {
      if (window.game?.sound?.context?.state === 'suspended') {
        window.game.sound.context.resume().then(() => {
          console.log('🔊 AudioContext resumed after user interaction');
        });
      }
      document.removeEventListener('click', resumeAudioContext);
    }, { once: true });
    
    console.log("⚔️ Initialisation du système de combat...");
    window.battleSystem = new BattleIntegration(window);

    setTimeout(async () => {
      try {
        console.log("🔧 [MAIN] Vérification pré-requis système de combat...");
        
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

        window.battleSystem = new BattleIntegration(window);
        const battleInitSuccess = await window.battleSystem.initialize(
          window.globalNetworkManager.room,
          window.game
        );
        if (battleInitSuccess) {
          console.log("✅ Système de combat initialisé");
        }

      } catch (error) {
        console.error("❌ Erreur initialisation système de combat:", error);
      }
    }, 5000);

    window.starterHUD = null;
    window.inventorySystemGlobal = null;
    window.encounterManagerGlobal = null;

    window.initEncounterSystem = function(scene, mapData = null) {
      console.log('🎲 [MAIN] Initialisation du système d\'encounters...');
      
      if (scene && scene.encounterManager && scene.encounterInitialized) {
        console.log('ℹ️ [MAIN] Système d\'encounters déjà initialisé pour cette scène - réutilisation');
        return scene.encounterManager;
      }
      
      try {
        const encounterManager = new ClientEncounterManager();
        
        if (mapData) {
          console.log('🗺️ [MAIN] Chargement données carte pour encounters...');
          encounterManager.loadMapData(mapData);
        } else if (scene && scene.map) {
          const mapKey = scene.mapKey || scene.scene.key.toLowerCase();
          const tilemapData = scene.cache?.tilemap?.get(mapKey);
          if (tilemapData && tilemapData.data) {
            console.log('🗺️ [MAIN] Données carte récupérées depuis la scène');
            encounterManager.loadMapData(tilemapData.data);
          } else {
            console.warn('⚠️ [MAIN] Impossible de récupérer les données de carte');
          }
        }
        
        window.encounterManagerGlobal = encounterManager;
        
        if (scene) {
          scene.encounterManager = encounterManager;
          scene.encounterInitialized = true;
        }
        
        console.log('✅ [MAIN] Système d\'encounters initialisé avec succès');
        
        if (typeof window.onSystemInitialized === 'function') {
          window.onSystemInitialized('encounters');
        }
        
        return encounterManager;
        
      } catch (error) {
        console.error('❌ [MAIN] Erreur initialisation système d\'encounters:', error);
        return null;
      }
    };

    window.forceInitEncounterSystem = function(scene, mapData = null) {
      console.log('🔧 [MAIN] Force initialisation système d\'encounters...');
      
      if (window.encounterManagerGlobal) {
        console.log('🧹 [MAIN] Nettoyage ancien EncounterManager...');
        window.encounterManagerGlobal = null;
      }
      
      if (scene) {
        scene.encounterManager = null;
        scene.encounterInitialized = false;
      }
      
      return window.initEncounterSystem(scene, mapData);
    };

    window.initBattleSystem = function(gameRoom) {
      console.log('⚔️ [MAIN] Initialisation du système de combat avec UI...');
      
      if (window.battleSystem && window.battleSystem.isInitialized) {
        console.log('ℹ️ [MAIN] Système de combat déjà initialisé - réutilisation');
        return window.battleSystem;
      }
      
      try {
        if (!window.battleSystem) {
          window.battleSystem = new BattleIntegration(window);
        }
        
        if (window.game) {
          window.battleSystem.initialize(
            gameRoom || window.currentGameRoom,
            window.game
          ).then(success => {
            if (success) {
              console.log('✅ [MAIN] Système de combat avec UI initialisé avec succès');
              
              window.testBattleUITransition = function() {
                console.log('🧪 [MAIN] Test transition UI battle...');
                
                if (window.battleSystem?.battleUITransition) {
                  return window.battleSystem.battleUITransition.startBattleTransition({
                    pokemon: { name: 'Pikachu Test', level: 5 },
                    location: 'test_zone'
                  }).then(success => {
                    if (success) {
                      console.log('✅ Transition UI vers combat OK');
                      
                      setTimeout(() => {
                        window.battleSystem.battleUITransition.endBattleTransition({
                          result: 'victory',
                          experience: 50
                        }).then(returned => {
                          if (returned) {
                            console.log('✅ Retour exploration OK');
                          }
                        });
                      }, 3000);
                    }
                    return success;
                  });
                } else {
                  console.error('❌ BattleUITransition non disponible');
                  return false;
                }
              };
              
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

    window.testBattleUIOnly = function() {
      console.log('🎨 [MAIN] Test transition UI battle uniquement...');
      
      if (!window.pokemonUISystem) {
        console.error('❌ PokemonUISystem requis pour le test');
        return false;
      }
      
      const transition = new BattleUITransition(
        window.pokemonUISystem.uiManager,
        window.globalNetworkManager
      );
      
      return transition.startBattleTransition({
        pokemon: { name: 'Pikachu UI Test', level: 8 },
        location: 'ui_test'
      }).then(success => {
        if (success) {
          console.log('✅ Transition UI OK - icônes masquées');
          
          setTimeout(() => {
            transition.endBattleTransition({
              result: 'victory'
            }).then(() => {
              console.log('✅ Retour UI OK - icônes restaurées');
            });
          }, 2000);
        }
        return success;
      });
    };

    window.testCompleteBattleWithUI = function() {
      console.log('🚀 [MAIN] Test combat complet avec transition UI...');
      
      if (!window.battleSystem?.isInitialized) {
        console.error('❌ Système de combat non initialisé');
        return false;
      }
      
      const testPokemon = {
        pokemonId: 25,
        level: 10,
        name: 'Pikachu Complet',
        shiny: false,
        gender: 'male',
        currentHp: 30,
        maxHp: 30,
        moves: ['thunder_shock', 'growl', 'tail_whip', 'thunder_wave']
      };
      
      return window.battleSystem.startWildBattle({
        pokemon: testPokemon,
        location: 'test_complete',
        method: 'ui_test'
      });
    };

    window.debugBattleSystem = function() {
      console.log('🔍 === DEBUG SYSTÈME DE COMBAT COMPLET AVEC UI ===');
      
      const battleStatus = {
        battleSystemGlobal: {
          exists: !!window.battleSystem,
          initialized: window.battleSystem?.isInitialized || false,
          type: typeof window.battleSystem
        },
        
        battleScene: {
          existsInPhaser: !!window.game?.scene?.getScene('BattleScene'),
          isActive: window.game?.scene?.isActive('BattleScene') || false,
          isVisible: window.game?.scene?.isVisible('BattleScene') || false
        },
        
        battleState: {
          inBattle: window.battleSystem?.isCurrentlyInBattle() || false,
          currentState: window.battleSystem?.getCurrentBattleState() || null
        },
        
        uiTransition: {
          available: !!(window.battleSystem?.battleUITransition),
          active: window.battleSystem?.battleUITransition?.isBattleActive() || false,
          transitioning: window.battleSystem?.battleUITransition?.isCurrentlyTransitioning() || false,
          state: window.battleSystem?.battleUITransition?.getCurrentUIState() || null
        },
        
        uiManager: {
          pokemonUISystem: !!window.pokemonUISystem,
          uiManagerGlobal: !!window.uiManager,
          currentGameState: window.pokemonUISystem?.currentGameState || 'unknown'
        },
        
        functions: {
          initBattleSystem: typeof window.initBattleSystem,
          testBattle: typeof window.testBattle,
          testBattleUIOnly: typeof window.testBattleUIOnly,
          testCompleteBattleWithUI: typeof window.testCompleteBattleWithUI,
          startWildBattle: typeof window.startWildBattle,
          exitBattle: typeof window.exitBattle
        }
      };
      
      console.log('📊 Status système de combat avec UI:', battleStatus);
      
      if (window.battleSystem?.debug) {
        console.log('🔧 Debug détaillé BattleIntegration:');
        const detailedDebug = window.battleSystem.debug();
        console.log(detailedDebug);
      }
      
      return battleStatus;
    };

    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'u' && !window.shouldBlockInput()) {
        event.preventDefault();
        console.log('🎨 [MAIN] Raccourci U - Test transition UI battle');
        window.testBattleUIOnly?.();
      }
      
      if (event.key.toLowerCase() === 'b' && !window.shouldBlockInput()) {
        event.preventDefault();
        console.log('⚔️ [MAIN] Raccourci B - Test combat complet avec UI');
        if (window.testCompleteBattleWithUI) {
          window.testCompleteBattleWithUI();
        } else {
          window.testBattle?.();
        }
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      
      window.addEventListener('battleUITransitionComplete', (event) => {
        console.log('🎬 [MAIN] Transition UI battle terminée:', event.detail);
        
        if (window.onBattleUIReady) {
          window.onBattleUIReady(event.detail);
        }
      });
      
      window.addEventListener('pokemonUIStateChanged', (event) => {
        const { newState } = event.detail;
        console.log(`🎮 [MAIN] État UI changé: ${newState}`);
        
        if (window.battleSystem?.battleUITransition) {
          console.log('🔄 [MAIN] Synchronisation UI battle automatique');
        }
      });
      
      console.log('✅ [MAIN] Événements UI battle configurés');
    });

    window.validateBattleUISystem = function() {
      console.log('🔍 [MAIN] Validation système UI battle...');
      
      const requirements = {
        pokemonUISystem: !!window.pokemonUISystem,
        uiManager: !!(window.pokemonUISystem?.uiManager || window.uiManager),
        battleSystem: !!window.battleSystem,
        battleUITransition: !!(window.battleSystem?.battleUITransition),
        gameManager: !!window.globalNetworkManager,
        phaserGame: !!window.game
      };
      
      console.log('📋 Pré-requis UI battle:', requirements);
      
      const allReady = Object.values(requirements).every(req => req === true);
      
      if (allReady) {
        console.log('✅ [MAIN] Système UI battle complet et prêt !');
        console.log('🧪 Utilisez window.testBattleUIOnly() pour tester la transition UI');
        console.log('⚔️ Utilisez window.testCompleteBattleWithUI() pour test complet');
      } else {
        console.warn('⚠️ [MAIN] Système UI battle incomplet:');
        Object.entries(requirements).forEach(([key, value]) => {
          if (!value) {
            console.warn(`  ❌ ${key}: manquant`);
          }
        });
      }
      
      return allReady;
    };

    window.debugEncounterSystem = function() {
      console.log('🔍 === DEBUG SYSTÈME D\'ENCOUNTERS COMPLET ===');
      
      const encounterStatus = {
        encounterManagerGlobal: {
          exists: !!window.encounterManagerGlobal && window.encounterManagerGlobal !== null,
          type: typeof window.encounterManagerGlobal,
          isNull: window.encounterManagerGlobal === null,
          isUndefined: window.encounterManagerGlobal === undefined,
          stats: null,
          hasGetStats: !!(window.encounterManagerGlobal?.getStats)
        },
        
        activeScene: null,
        
        functions: {
          initEncounterSystem: typeof window.initEncounterSystem,
          forceInitEncounterSystem: typeof window.forceInitEncounterSystem,
          testEncounter: typeof window.testEncounter,
          debugEncounters: typeof window.debugEncounters
        }
      };

      try {
        if (window.encounterManagerGlobal && typeof window.encounterManagerGlobal.getStats === 'function') {
          encounterStatus.encounterManagerGlobal.stats = window.encounterManagerGlobal.getStats();
        }
      } catch (error) {
        encounterStatus.encounterManagerGlobal.statsError = error.message;
      }
      
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

        try {
          if (activeScene.encounterManager && typeof activeScene.encounterManager.getStats === 'function') {
            encounterStatus.activeScene.sceneStats = activeScene.encounterManager.getStats();
          }
        } catch (error) {
          encounterStatus.activeScene.sceneStatsError = error.message;
        }
      }
      
      console.log('📊 Status encounters:', encounterStatus);

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

    window.fixEncounterSystem = function() {
      console.log('🔧 === TENTATIVE DE RÉPARATION SYSTÈME D\'ENCOUNTERS ===');
      
      const currentScene = window.game?.scene?.getScenes(true)[0];
      if (!currentScene) {
        console.error('❌ Aucune scène active trouvée');
        return false;
      }
      
      console.log(`🎬 Réparation encounters sur scène: ${currentScene.scene.key}`);
      
      const encounterManager = window.forceInitEncounterSystem(currentScene);
      
      if (!encounterManager) {
        console.error('❌ Échec force init encounters');
        return false;
      }
      
      setTimeout(() => {
        window.debugEncounterSystem();
        console.log('🎯 Essayez window.testEncounter() pour tester');
      }, 1000);
      
      return true;
    };

    window.fixBattleSystem = function() {
      console.log('🔧 === TENTATIVE DE RÉPARATION SYSTÈME DE COMBAT ===');
      
      if (window.battleSystem) {
        console.log('🧹 Nettoyage ancien BattleSystem...');
        if (window.battleSystem.destroy) {
          window.battleSystem.destroy();
        }
        window.battleSystem = null;
      }
      
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

    window.autoFixEncounters = function() {
      console.log('🔧 === RÉPARATION AUTOMATIQUE ENCOUNTERS ===');
      
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (!activeScene) {
        console.error('❌ Aucune scène active');
        return false;
      }
      
      console.log(`🎬 Réparation sur scène: ${activeScene.scene.key}`);
      
      console.log('🧹 Nettoyage complet...');
      window.encounterManagerGlobal = null;
      if (activeScene.encounterManager) {
        activeScene.encounterManager = null;
        activeScene.encounterInitialized = false;
      }
      
      console.log('🚀 Réinitialisation...');
      const result = window.initEncounterSystem(activeScene);
      
      if (result) {
        console.log('✅ Réparation réussie !');
        
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

    window.debugUIIcons = function() {
      console.log('🔍 === DEBUG UI ICONS ===');
      
      const icons = {
        inventory: document.querySelector('#inventory-icon'),
        team: document.querySelector('#team-icon'),
        quest: document.querySelector('#quest-icon')
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

    window.openInventory = function() {
      if (window.inventorySystemGlobal) {
        window.inventorySystemGlobal.openInventory();
        window.showGameNotification("Inventaire ouvert", "info", { duration: 1500, position: 'bottom-right' });
      } else {
        window.showGameAlert?.("Système d'inventaire non initialisé");
      }
    };
    
    window.toggleInventory = function() {
      if (window.pokemonUISystem && window.pokemonUISystem.getOriginalModule) {
        const inventoryModule = window.pokemonUISystem.getOriginalModule('inventory');
        if (inventoryModule && inventoryModule.toggleInventory) {
          inventoryModule.toggleInventory();
          return;
        }
      }
      
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
      
      const result = window.battleSystem.test ? window.battleSystem.test() : window.battleSystem.testBattle?.();
      
      if (result) {
        window.showGameNotification("Test de combat lancé !", "info", { duration: 2000, position: 'top-center' });
        console.log("✅ Combat de test démarré");
      } else {
        window.showGameAlert?.("Échec du test de combat");
        console.log("❌ Échec du test de combat");
      }
    };

    window.testBattleModern = function() {
      if (!window.battleSystem?.isInitialized) {
        console.error('❌ Système de combat non initialisé');
        return false;
      }
      
      return window.battleSystem.test();
    };

    window.startWildBattle = function(pokemonData = null) {
      if (!window.battleSystem) {
        window.showGameAlert?.("Système de combat non initialisé");
        return false;
      }

      if (!window.battleSystem.isInitialized) {
        window.showGameAlert?.("Système de combat pas encore prêt");
        return false;
      }

      const testPokemon = pokemonData || {
        pokemonId: 25,
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
      
      const activeScene = window.game.scene.getScenes(true)[0];
      if (activeScene && activeScene.transitionManager) {
        activeScene.transitionManager.forceTransition(targetZone);
      } else {
        console.warn(`⚠️ [MAIN] Aucun TransitionManager trouvé sur la scène active`);
        window.switchToZone(targetZone);
      }
    };

    console.log("🎮 Création du système de chargement UI...");
    window.globalLoadingScreen = LoadingScreen.createGlobal({
      enabled: true,
      fastMode: false,
      theme: 'uiInit'
    });
    
    window.initializePokemonUI = async function() {
      console.log("🚀 [MAIN] === INITIALISATION POKÉMON UI CORRIGÉE ===");
      
      try {
        await window.globalLoadingScreen.showUIInitLoading();
        
        const uiResult = await initializePokemonUI();
        
        if (uiResult.success) {
          console.log("✅ Système UI Pokémon initialisé avec succès !");
          window.showGameNotification?.("Interface utilisateur prête !", "success", { 
            duration: 2000, 
            position: 'bottom-center' 
          });
        } else {
          console.error("❌ Erreur initialisation UI Pokémon:", uiResult.error);
          window.showGameNotification?.("Erreur interface utilisateur", "error", { 
            duration: 3000, 
            position: 'top-center' 
          });
        }
        
        return uiResult;
        
      } catch (error) {
        console.error("❌ Erreur critique initialisation UI:", error);
        window.showGameNotification?.("Erreur critique interface", "error", { 
          duration: 5000, 
          position: 'top-center' 
        });
        return { success: false, error: error.message };
      }
    };

    window.initializeUIWithLoading = window.initializePokemonUI;

    showNotificationInstructions();

    window.setUIGameState = function(stateName, options = {}) {
      if (window.pokemonUISystem) {
        console.log(`🎮 [UI] Changement état UI: ${stateName}`);
        return window.pokemonUISystem.setGameState(stateName, options);
      } else {
        console.warn('⚠️ [UI] PokemonUISystem non initialisé');
        return false;
      }
    };

    window.debugPokemonUI = function() {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.debugInfo();
      } else {
        console.error('❌ [UI] PokemonUISystem non disponible');
        return { error: 'PokemonUISystem non initialisé' };
      }
    };

    window.testPokemonUI = function() {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.testAllModules();
      } else {
        console.error('❌ [UI] PokemonUISystem non disponible');
        return false;
      }
    };

    window.showUIModule = function(moduleId, options = {}) {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.showModule(moduleId, options);
      } else {
        console.warn('⚠️ [UI] PokemonUISystem non initialisé');
        return false;
      }
    };

    window.hideUIModule = function(moduleId, options = {}) {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.hideModule(moduleId, options);
      } else {
        console.warn('⚠️ [UI] PokemonUISystem non initialisé');
        return false;
      }
    };

    window.getUIModuleState = function(moduleId) {
      if (window.pokemonUISystem && window.uiManager) {
        return window.uiManager.getModuleState(moduleId);
      } else {
        console.warn('⚠️ [UI] UIManager non disponible');
        return null;
      }
    };
    
    console.log("🎯 [MAIN] Tous les systèmes initialisés !");
    console.log("🎒 Utilisez 'I' pour ouvrir l'inventaire en jeu");
    console.log("⚔️ Utilisez 'T' pour ouvrir l'équipe en jeu");
    console.log("📋 Utilisez 'Q' pour ouvrir le journal des quêtes en jeu");
    console.log("🎲 Utilisez 'F' pour debug encounters en jeu");
    console.log("🎲 Utilisez 'G' pour forcer un encounter en jeu");
    console.log("⚔️ Utilisez 'B' pour tester le système de combat en jeu");
    console.log("🎮 Le nouveau système UI Pokémon est maintenant actif !");
    console.log("🎛️ Utilisez window.setUIGameState('battle') pour changer l'état UI");
    console.log("🔍 Utilisez window.debugPokemonUI() pour debug l'interface");
    console.log("🧪 Utilisez window.testPokemonUI() pour tester tous les modules");
    console.log("🌍 Utilisez window.listAvailableZones() pour voir les zones disponibles");
    console.log("🔄 Utilisez window.testTransition('village') pour tester les transitions");
    console.log("⚔️ Utilisez window.testBattle() pour tester le système de combat");
    
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

export default {};

// === FONCTIONS UTILITAIRES NETTOYÉES ===

window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};

window.isStarterHUDOpen = function() {
  return window.starterHUD ? window.starterHUD.isVisible : false;
};

// ✅ NOUVELLES FONCTIONS QUEST VIA BASEMODULE UNIQUEMENT
window.isQuestJournalOpen = function() {
  if (window.pokemonUISystem) {
    const questModule = window.pokemonUISystem.getOriginalModule?.('quest');
    if (questModule) {
      if (typeof questModule.isQuestJournalOpen === 'function') {
        return questModule.isQuestJournalOpen();
      }
      
      if (questModule.ui && typeof questModule.ui.isJournalOpen === 'function') {
        return questModule.ui.isJournalOpen();
      }
    }
  }
  
  // Fallback DOM uniquement
  const questOverlay = document.querySelector('#quest-journal-overlay, .quest-journal-overlay');
  return questOverlay ? questOverlay.style.display !== 'none' : false;
};

window.isInventoryOpen = function() {
  if (window.pokemonUISystem) {
    const inventoryModule = window.pokemonUISystem.getOriginalModule?.('inventory');
    if (inventoryModule && typeof inventoryModule.isInventoryOpen === 'function') {
      return inventoryModule.isInventoryOpen();
    }
  }
  
  if (window.inventorySystemGlobal && typeof window.inventorySystemGlobal.isInventoryOpen === 'function') {
    return window.inventorySystemGlobal.isInventoryOpen();
  }
  
  return false;
};

window.isTeamOpen = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule?.('team');
    if (teamModule) {
      if (typeof teamModule.isTeamOpen === 'function') {
        return teamModule.isTeamOpen();
      }
      
      if (teamModule.ui && typeof teamModule.ui.isVisible === 'function') {
        return teamModule.ui.isVisible();
      }
    }
  }
  
  // Fallback DOM
  const teamOverlay = document.querySelector('#team-overlay, .team-overlay');
  return teamOverlay ? teamOverlay.style.display !== 'none' : false;
};

window.isEncounterActive = function() {
  const activeScene = window.game?.scene?.getScenes(true)[0];
  return activeScene?.encounterActive || false;
};

window.isBattleActive = function() {
  try {
    return window.battleSystem?.isCurrentlyInBattle?.() || false;
  } catch (error) {
    console.warn('[isBattleActive] Erreur:', error);
    return false;
  }
};

window.shouldBlockInput = function() {
  return window.isChatFocused() ||
    window.isStarterHUDOpen() ||
    window.isQuestJournalOpen() ||
    window.isInventoryOpen() ||
    window.isTeamOpen() ||
    window.isEncounterActive() ||
    window.isBattleActive() ||
    window.isStarterSelectionActive();
};

window.canPlayerInteract = function() {
  if (window.inventorySystemGlobal && typeof window.inventorySystemGlobal.canPlayerInteract === 'function') {
    return window.inventorySystemGlobal.canPlayerInteract();
  }
  
  return !window.shouldBlockInput();
};

// ✅ NOUVELLES FONCTIONS DE CONTRÔLE QUEST VIA BASEMODULE
window.toggleQuest = function() {
  if (window.pokemonUISystem) {
    const questModule = window.pokemonUISystem.getOriginalModule?.('quest');
    if (questModule) {
      if (typeof questModule.toggleQuestJournal === 'function') {
        questModule.toggleQuestJournal();
        return;
      }
      
      if (typeof questModule.toggle === 'function') {
        questModule.toggle();
        return;
      }
      
      if (questModule.ui && typeof questModule.ui.toggleJournal === 'function') {
        questModule.ui.toggleJournal();
        return;
      }
    }
  }
  
  console.warn('⚠️ Nouveau système Quest non disponible');
  window.showGameNotification?.("Système de quêtes en cours de chargement...", "info", { 
    duration: 2000, 
    position: 'top-center' 
  });
};

window.openQuest = function() {
  if (window.pokemonUISystem) {
    const questModule = window.pokemonUISystem.getOriginalModule?.('quest');
    if (questModule) {
      if (typeof questModule.openQuestJournal === 'function') {
        questModule.openQuestJournal();
        return;
      }
      
      if (typeof questModule.open === 'function') {
        questModule.open();
        return;
      }
    }
  }
  
  window.showGameNotification?.("Journal des quêtes ouvert", "info", { duration: 1500, position: 'bottom-right' });
};

window.closeQuest = function() {
  if (window.pokemonUISystem) {
    const questModule = window.pokemonUISystem.getOriginalModule?.('quest');
    if (questModule) {
      if (typeof questModule.closeQuestJournal === 'function') {
        questModule.closeQuestJournal();
        return;
      }
      
      if (typeof questModule.close === 'function') {
        questModule.close();
        return;
      }
      
      if (typeof questModule.forceCloseUI === 'function') {
        questModule.forceCloseUI();
        return;
      }
    }
  }
  
  // Fallback DOM brutal si nécessaire
  const questElements = document.querySelectorAll('#quest-journal-overlay, .quest-journal-overlay');
  questElements.forEach(el => {
    if (el.style) {
      el.style.display = 'none';
    }
  });
};

// ✅ NOUVELLES FONCTIONS DE CONTRÔLE TEAM VIA BASEMODULE
window.toggleTeam = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule?.('team');
    if (teamModule) {
      if (typeof teamModule.toggleTeamUI === 'function') {
        teamModule.toggleTeamUI();
        return;
      }
      
      if (typeof teamModule.toggle === 'function') {
        teamModule.toggle();
        return;
      }
    }
  }
  
  console.warn('⚠️ Nouveau système Team non disponible');
};

window.openTeam = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule?.('team');
    if (teamModule && typeof teamModule.openTeam === 'function') {
      teamModule.openTeam();
      return;
    }
  }
  
  window.showGameNotification?.("Équipe ouverte", "info", { duration: 1500, position: 'bottom-right' });
};

window.closeTeam = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule?.('team');
    if (teamModule) {
      if (typeof teamModule.closeTeam === 'function') {
        teamModule.closeTeam();
        return;
      }
      
      if (typeof teamModule.forceCloseUI === 'function') {
        teamModule.forceCloseUI();
        return;
      }
    }
  }
  
  // Fallback DOM
  const teamElements = document.querySelectorAll('#team-overlay, .team-overlay');
  teamElements.forEach(el => {
    if (el.style) {
      el.style.display = 'none';
    }
  });
};

window.forceCloseTeam = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule?.('team');
    if (teamModule && teamModule.forceCloseUI) {
      teamModule.forceCloseUI();
      return;
    }
  }
  
  const teamOverlay = document.querySelector('#team-overlay');
  if (teamOverlay) {
    teamOverlay.style.display = 'none';
  }
  
  const teamModals = document.querySelectorAll('.team-overlay, .team-modal, [id*="team-"]');
  teamModals.forEach(modal => {
    if (modal.style) {
      modal.style.display = 'none';
    }
  });
};

// ✅ FONCTION TEST QUEST BASEMODULE
window.testQuest = function() {
  console.log('📖 === TEST NOUVEAU SYSTÈME QUEST BASEMODULE ===');
  
  if (!window.pokemonUISystem) {
    window.showGameAlert?.("PokemonUISystem non initialisé");
    console.log("❌ pokemonUISystem manquant");
    return;
  }
  
  const questModule = window.pokemonUISystem.getOriginalModule?.('quest');
  if (!questModule) {
    window.showGameAlert?.("Module Quest non trouvé dans pokemonUISystem");
    console.log("❌ Module Quest non trouvé");
    return;
  }
  
  console.log('✅ Module Quest trouvé:', typeof questModule);
  
  // Test des méthodes disponibles
  const methods = [
    'toggleQuestJournal', 'openQuestJournal', 'closeQuestJournal',
    'isQuestJournalOpen', 'toggle', 'open', 'close', 'forceCloseUI'
  ];
  
  console.log('🔍 Méthodes disponibles:');
  methods.forEach(method => {
    const available = typeof questModule[method] === 'function';
    console.log(`  ${available ? '✅' : '❌'} ${method}: ${typeof questModule[method]}`);
  });
  
  // Test d'ouverture
  try {
    window.toggleQuest();
    window.showGameNotification?.("Test nouveau Quest réussi !", "success", { duration: 2000, position: 'top-center' });
    console.log('✅ Test nouveau Quest terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur test Quest:', error);
    window.showGameAlert?.("Erreur test Quest: " + error.message);
  }
};

// ✅ FONCTION TEST TEAM BASEMODULE
window.testTeam = function() {
  console.log('⚔️ === TEST NOUVEAU SYSTÈME TEAM BASEMODULE ===');
  
  if (!window.pokemonUISystem) {
    window.showGameAlert?.("PokemonUISystem non initialisé");
    console.log("❌ pokemonUISystem manquant");
    return;
  }
  
  const teamModule = window.pokemonUISystem.getOriginalModule?.('team');
  if (!teamModule) {
    window.showGameAlert?.("Module Team non trouvé dans pokemonUISystem");
    console.log("❌ Module Team non trouvé");
    return;
  }
  
  console.log('✅ Module Team trouvé:', typeof teamModule);
  
  // Test d'ouverture
  try {
    window.toggleTeam();
    window.showGameNotification?.("Test nouveau Team réussi !", "success", { duration: 2000, position: 'top-center' });
    console.log('✅ Test nouveau Team terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur test Team:', error);
    window.showGameAlert?.("Erreur test Team: " + error.message);
  }
};

window.getGameSystemsStatus = function() {
  const status = {
    chat: { initialized: !!window.pokeChat, focused: window.isChatFocused() },
    inventory: { initialized: !!window.inventorySystemGlobal, open: window.isInventoryOpen() },
    
    // ✅ NOUVEAU: Quest via pokemonUISystem uniquement
    quests: { 
      initialized: !!(window.pokemonUISystem?.getOriginalModule?.('quest')),
      journalOpen: window.isQuestJournalOpen(),
      newSystem: true,
      oldSystemRemoved: true
    },
    
    starter: { initialized: !!window.starterHUD, open: window.isStarterHUDOpen() },
    
    // ✅ NOUVEAU: Team via pokemonUISystem uniquement
    team: { 
      initialized: !!(window.pokemonUISystem?.getOriginalModule?.('team')), 
      open: window.isTeamOpen(),
      newSystem: true,
      oldSystemRemoved: true
    },
    
    encounters: { 
      initialized: !!window.encounterManagerGlobal, 
      active: window.isEncounterActive(),
      globalManager: !!window.encounterManagerGlobal,
      sceneManager: !!window.game?.scene?.getScenes(true)[0]?.encounterManager
    },
    
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
    
    starterSelection: { 
      initialized: !!window.starterSelector, 
      active: window.isStarterSelectionActive?.() || false,
      utils: typeof StarterUtils === 'object'
    },
    
    sceneRegistry: {
      initialized: !!window.sceneRegistry,
      availableZones: window.sceneRegistry?.getAvailableZones() || [],
      zoneCount: window.sceneRegistry?.getAvailableZones().length || 0
    },
    
    // ✅ NOUVEAU: État pokemonUISystem
    pokemonUISystem: {
      initialized: !!window.pokemonUISystem,
      currentGameState: window.pokemonUISystem?.currentGameState || 'unknown',
      questModule: !!(window.pokemonUISystem?.getOriginalModule?.('quest')),
      teamModule: !!(window.pokemonUISystem?.getOriginalModule?.('team')),
      inventoryModule: !!(window.pokemonUISystem?.getOriginalModule?.('inventory'))
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
  
  if (window.globalNetworkManager) {
    console.log("📡 Debug NetworkManager:");
    window.globalNetworkManager.debugState();
  } else {
    console.log("❌ NetworkManager global introuvable");
  }
  
  if (window.sceneRegistry) {
    console.log("🏗️ Debug SceneRegistry:");
    window.debugSceneRegistry();
  } else {
    console.log("❌ SceneRegistry global introuvable");
  }

  if (window.encounterManagerGlobal) {
    console.log("🎲 Debug EncounterManager:");
    window.debugEncounterSystem();
  } else {
    console.log("❌ EncounterManager global introuvable");
  }

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

window.showGameHelp = function() {
  window.showGameNotification?.("Aide affichée dans la console", "info", { duration: 3000, position: 'top-center' });
  console.log(`
🎮 === AIDE DU JEU (SYSTÈMES BASEMODULE) ===

=== Contrôles de base ===
• I - Ouvrir/Fermer l'inventaire
• Q - Ouvrir/Fermer le journal des quêtes (NOUVEAU SYSTÈME)
• T - Ouvrir/Fermer l'équipe (NOUVEAU SYSTÈME)
• F - Debug encounters (dans les zones)
• G - Forcer un encounter (dans les zones)
• B - Tester le système de combat
• U - Tester transition UI battle uniquement
• E - Interagir avec NPCs/objets
• S - Afficher sélection starter (test)
• ESC - Fermer sélection starter
• WASD ou Flèches - Déplacement

=== Fonctions de test ===
• window.testInventory() - Tester l'inventaire
• window.testQuest() - Tester le NOUVEAU système de quêtes
• window.testTeam() - Tester le NOUVEAU système d'équipe
• window.testEncounter() - Tester les encounters
• window.testBattle() - Tester le système de combat
• window.testBattleUIOnly() - Test transition UI uniquement
• window.testCompleteBattleWithUI() - Test combat complet avec UI

=== Systèmes disponibles (BaseModule) ===
• Inventaire: ${!!(window.pokemonUISystem?.getOriginalModule?.('inventory'))}
• Quêtes: ${!!(window.pokemonUISystem?.getOriginalModule?.('quest'))} (NOUVEAU)
• Équipe: ${!!(window.pokemonUISystem?.getOriginalModule?.('team'))} (NOUVEAU)
• Encounters: ${!!window.encounterManagerGlobal}
• Combat: ${!!window.battleSystem} (prêt: ${window.battleSystem?.isInitialized || false})
• PokemonUISystem: ${!!window.pokemonUISystem}

=== CHANGEMENTS IMPORTANTS ===
❌ ANCIEN système de quêtes SUPPRIMÉ
✅ NOUVEAU système via BaseModule + UIManager
❌ Plus de window.questSystemGlobal
✅ Utiliser window.pokemonUISystem.getOriginalModule('quest')
✅ Système Team également via BaseModule
✅ Interface UI Manager moderne

=== Fonctions de debug ===
• window.debugGameSystems() - Debug complet des systèmes
• window.debugPokemonUI() - Debug interface Pokémon
• window.debugBattleSystem() - Debug système de combat
• window.validateBattleUISystem() - Validation UI battle
• window.getGameSystemsStatus() - Statut des systèmes

=== Utilitaires ===
• window.listAvailableZones() - Lister zones disponibles
• window.testTransition('village') - Test transition
• window.quickTestNotifications() - Test notifications rapide

========================
  `);
};

console.log(`
🎉 === POKÉMON MMO NETTOYÉ (BASEMODULE UNIQUEMENT) ===
Utilisez window.showGameHelp() pour l'aide complète
🧹 ANCIEN système Quest SUPPRIMÉ
✅ NOUVEAU système Quest via BaseModule
✅ NOUVEAU système Team via BaseModule  
✅ Interface UI Manager moderne
⚔️ Système de combat avec transition UI
🎮 États de jeu: exploration, battle, pokemonCenter, dialogue
==============================
`);

setTimeout(() => {
  if (typeof window.validateBattleUISystem === 'function') {
    window.validateBattleUISystem();
  }
}, 10000);
