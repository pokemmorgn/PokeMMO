import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { LoadingScreen } from './components/LoadingScreen.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { StarterUtils } from './components/StarterSelector.js';
import { BattleIntegration } from './managers/BattleIntegration.js';

// Scenes
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
import { initializeGameNotifications } from './notification.js';
import { ClientEncounterManager } from './managers/EncounterManager.js';
import { BattleScene } from './scenes/BattleScene.js';
import { initializePokemonUI } from './ui.js';
import './debug-notifications.js';

const ENDPOINT =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.hostname +
  (location.port ? ":" + location.port : "") +
  "/ws";

const client = new Client(ENDPOINT);
window.client = client;

// === CONFIGURATION ET CONNEXION ===

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

// === SYSTÈME DE SCÈNES ===

async function initializeSceneSystem() {
  const registry = SceneRegistry.getInstance();
  
  // Enregistrement des scènes principales
  registry.registerSceneClass('beach', BeachScene);
  registry.registerSceneClass('village', VillageScene);
  registry.registerSceneClass('villagelab', VillageLabScene);
  registry.registerSceneClass('road1', Road1Scene);
  registry.registerSceneClass('villagehouse1', VillageHouse1Scene);
  registry.registerSceneClass('lavandia', LavandiaScene);
  
  window.sceneRegistry = registry;
  
  // Fonctions de transition
  window.switchToZone = async function(zoneName, transitionData = {}) {
    const sceneKey = registry.getSceneKey(zoneName);
    const targetScene = window.game.scene.getScene(sceneKey);
    
    if (!targetScene) {
      console.error(`❌ Scène ${sceneKey} introuvable`);
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
  
  window.listAvailableZones = function() {
    return registry.getAvailableZones();
  };
  
  return registry;
}

// === SYSTÈME MÉTÉO GLOBAL ===

async function initializeGlobalWeatherSystem() {
  try {
    const success = await globalWeatherManager.initialize(window.globalNetworkManager);
    
    if (success) {
      window.globalWeatherManager = globalWeatherManager;
      
      window.getGlobalWeather = function() {
        return globalWeatherManager.getCurrentWeather();
      };
      
      window.getGlobalTime = function() {
        return globalWeatherManager.getCurrentTime();
      };
      
      window.registerSceneToWeather = function(scene, zoneName) {
        if (!globalWeatherManager.isInitialized) {
          console.warn("⚠️ Système météo pas prêt pour enregistrement");
          return false;
        }
        return globalWeatherManager.registerScene(scene, zoneName);
      };
      
      console.log("✅ Système météo global initialisé");
    } else {
      throw new Error("Échec initialisation GlobalWeatherManager");
    }
    
  } catch (error) {
    console.error("❌ Erreur initialisation système météo:", error);
    
    // Fallback
    window.globalWeatherManager = {
      isInitialized: false,
      getCurrentWeather: () => ({ weather: 'clear', displayName: 'Ciel dégagé' }),
      getCurrentTime: () => ({ hour: 12, isDayTime: true }),
      registerScene: () => false
    };
  }
}

// === SYSTÈME D'ENCOUNTERS ===

window.initEncounterSystem = function(scene, mapData = null) {
  if (scene?.encounterManager && scene.encounterInitialized) {
    return scene.encounterManager;
  }
  
  try {
    const encounterManager = new ClientEncounterManager();
    
    if (mapData) {
      encounterManager.loadMapData(mapData);
    } else if (scene?.map) {
      const mapKey = scene.mapKey || scene.scene.key.toLowerCase();
      const tilemapData = scene.cache?.tilemap?.get(mapKey);
      if (tilemapData?.data) {
        encounterManager.loadMapData(tilemapData.data);
      }
    }
    
    window.encounterManagerGlobal = encounterManager;
    
    if (scene) {
      scene.encounterManager = encounterManager;
      scene.encounterInitialized = true;
    }
    
    return encounterManager;
    
  } catch (error) {
    console.error('❌ Erreur initialisation système encounters:', error);
    return null;
  }
};

// === SYSTÈME DE COMBAT ===

window.initBattleSystem = function(gameRoom) {
  if (window.battleSystem?.isInitialized) {
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
          console.log('✅ Système de combat initialisé');
        } else {
          console.error('❌ Échec initialisation système de combat');
        }
      });
    }
    
    return window.battleSystem;
    
  } catch (error) {
    console.error('❌ Erreur initialisation système de combat:', error);
    return null;
  }
};

// === CONFIGURATION PHASER ===

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

// === CSS POUR STARTER HUD ===

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
  from { opacity: 0; transform: scale(0.9); } 
  to { opacity: 1; transform: scale(1); } 
}
.starter-card { 
  animation: slideUp 0.6s ease-out; 
}
.starter-card:nth-child(1) { animation-delay: 0.1s; }
.starter-card:nth-child(2) { animation-delay: 0.2s; }
.starter-card:nth-child(3) { animation-delay: 0.3s; }
@keyframes slideUp { 
  from { opacity: 0; transform: translateY(30px); } 
  to { opacity: 1; transform: translateY(0); } 
}
.starter-success-message { 
  animation: bounceIn 0.8s ease-out; 
}
@keyframes bounceIn { 
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); } 
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = starterHudCSS;
document.head.appendChild(styleSheet);

// === INITIALISATION PRINCIPALE ===

(async () => {
  try {
    // Système de notifications
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Système de notification initialisé");
    
    // NetworkManager global
    window.globalNetworkManager = new NetworkManager(client, window.username);
    
    const connectionSuccess = await window.globalNetworkManager.connect("beach", {
      spawnX: 52,
      spawnY: 48
    });
    
    if (!connectionSuccess) {
      throw new Error("Échec de connexion à la WorldRoom");
    }
    
    window.currentGameRoom = window.globalNetworkManager.room;
    console.log("✅ Connecté à la WorldRoom:", window.currentGameRoom.sessionId);
    
    // TimeService
    TimeService.getInstance().connectToRoom(window.currentGameRoom);
    
    // Système météo
    await initializeGlobalWeatherSystem();
    
    // Système de scènes
    await initializeSceneSystem();
    
    // Chat mondial
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    initPokeChat(worldChat, window.username);
    console.log("✅ Chat mondial connecté");

    // Écran de chargement étendu
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

    // Démarrage de Phaser avec chargement
    window.extendedLoadingScreen.show('extended');
    
    setTimeout(() => {
      window.game = new Phaser.Game(config);
    }, 1000);

    // AudioContext
    document.addEventListener('click', function resumeAudioContext() {
      if (window.game?.sound?.context?.state === 'suspended') {
        window.game.sound.context.resume().then(() => {
          console.log('🔊 AudioContext resumed');
        });
      }
      document.removeEventListener('click', resumeAudioContext);
    }, { once: true });
    
    // Initialisation du système de combat (délayée)
    setTimeout(async () => {
      try {
        const hasPrereqs = window.game && window.globalNetworkManager?.isConnected;
        
        if (!hasPrereqs) {
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

    // Initialisation du système UI Pokémon
    window.initializePokemonUI = async function() {
      try {
        const uiResult = await initializePokemonUI();
        
        if (uiResult.success) {
          console.log("✅ Système UI Pokémon initialisé");
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
        return { success: false, error: error.message };
      }
    };

    console.log("🎯 Tous les systèmes initialisés !");
    console.log("🎮 Nouveau système UI Pokémon actif !");
    
  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

// === FONCTIONS UTILITAIRES ===

window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};

window.isStarterHUDOpen = function() {
  return window.starterHUD ? window.starterHUD.isVisible : false;
};

window.isStarterSelectionActive = function() {
  return StarterUtils.isActive();
};

window.shouldBlockInput = function() {
  return window.isChatFocused() ||
    window.isStarterHUDOpen() ||
    window.isStarterSelectionActive() ||
    (window.pokemonUISystem?.isAnyUIOpen?.() || false) ||
    (window.battleSystem?.isCurrentlyInBattle?.() || false);
};

window.canPlayerInteract = function() {
  return !window.shouldBlockInput();
};

// === GESTION DES INPUTS ===
// Les contrôles sont gérés par les scènes individuelles et le système UI

// === FONCTIONS DE TRANSITION ===

window.testTransition = function(targetZone = 'village') {
  if (window.sceneRegistry && window.sceneRegistry.hasZone(targetZone)) {
    window.switchToZone(targetZone, { 
      spawnX: 100, 
      spawnY: 100,
      testMode: true 
    });
    window.showGameNotification?.(`Transition vers ${targetZone}`, "info", { 
      duration: 2000, 
      position: 'top-center' 
    });
  } else {
    console.error(`❌ Zone ${targetZone} non disponible`);
  }
};

// === FONCTIONS DE DEBUG ===

window.getGameSystemsStatus = function() {
  return {
    networkManager: {
      initialized: !!window.globalNetworkManager,
      connected: window.globalNetworkManager?.isConnected || false,
      sessionId: window.globalNetworkManager?.getSessionId() || null
    },
    ui: {
      pokemonUISystem: !!window.pokemonUISystem,
      ready: window.pokemonUISystem?.isReady?.() || false
    },
    battle: {
      initialized: !!window.battleSystem,
      ready: window.battleSystem?.isInitialized || false,
      inBattle: window.battleSystem?.isCurrentlyInBattle?.() || false
    },
    encounters: {
      global: !!window.encounterManagerGlobal,
      sceneManager: !!window.game?.scene?.getScenes(true)[0]?.encounterManager
    },
    weather: {
      initialized: window.globalWeatherManager?.isInitialized || false
    },
    scenes: {
      registry: !!window.sceneRegistry,
      availableZones: window.sceneRegistry?.getAvailableZones() || []
    },
    canInteract: window.canPlayerInteract()
  };
};

window.debugGameSystems = function() {
  const status = window.getGameSystemsStatus();
  console.log("🔍 État des systèmes:", status);
  return status;
};

console.log(`
🎉 === POKÉMON MMO PRÊT ===
✨ Système UI moderne intégré
⚔️ Combat MMO disponible
🎲 Système d'encounters actif
🌤️ Météo globale synchronisée
🔄 Transitions de scènes robustes
🎮 Contrôles gérés par les scènes et l'interface
========================
`);

export default {};
