import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { LoadingScreen } from './components/LoadingScreen.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { StarterUtils, integrateStarterSelectorToScene } from './components/StarterSelector.js';
import { BattleUITransition } from './Battle/BattleUITransition.js';

// Scene imports
import { LoaderScene } from "./scenes/LoaderScene.js";
import { BeachScene } from "./scenes/zones/BeachScene.js";
import { VillageScene } from "./scenes/zones/VillageScene.js";
import { Road1Scene } from './scenes/zones/Road1Scene.js';
import { VillageLabScene } from './scenes/zones/VillageLabScene.js';
import { VillageHouse1Scene } from './scenes/zones/VillageHouse1Scene.js';
import { LavandiaScene } from './scenes/zones/LavandiaScene.js';

// Additional scene imports
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
import { initializeGameNotifications } from './notification.js';
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

async function initializeSceneSystem() {
  const registry = SceneRegistry.getInstance();
  
  registry.registerSceneClass('beach', BeachScene);
  registry.registerSceneClass('village', VillageScene);
  registry.registerSceneClass('villagelab', VillageLabScene);
  registry.registerSceneClass('road1', Road1Scene);
  registry.registerSceneClass('villagehouse1', VillageHouse1Scene);
  registry.registerSceneClass('lavandia', LavandiaScene);
  
  window.sceneRegistry = registry;
  
  window.switchToZone = async function(zoneName, transitionData = {}) {
    const sceneKey = registry.getSceneKey(zoneName);
    const targetScene = window.game.scene.getScene(sceneKey);
    if (!targetScene) {
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
      window.game.scene.restart(sceneKey);
    }
  };
  
  window.listAvailableZones = function() {
    return registry.getAvailableZones();
  };
  
  return registry;
}

window.fixBattleClient = function() {
  if (!window.client || !window.battleSystem) {
    return false;
  }
  
  const battleConnection = window.battleSystem.battleConnection;
  const networkHandler = battleConnection?.networkHandler;
  
  if (networkHandler) {
    networkHandler.client = window.client;
    return true;
  }
  
  return false;
};

async function initializeGlobalWeatherSystem() {
  try {
    const success = await globalWeatherManager.initialize(window.globalNetworkManager);
    
    if (success) {
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
          return false;
        }
        return globalWeatherManager.registerScene(scene, zoneName);
      };
      
      window.onWeatherZoneChanged = function(zoneName) {
        globalWeatherManager.onZoneChanged(zoneName);
      };
      
    } else {
      throw new Error("Échec initialisation GlobalWeatherManager");
    }
    
  } catch (error) {
    console.error("❌ Erreur initialisation système météo global:", error);
    
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
  }
}

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

(async () => {
  try {
    initializeGameNotifications();
    
    window.globalNetworkManager = new NetworkManager(client, window.username);
    
    const connectionSuccess = await window.globalNetworkManager.connect("beach", {
      spawnX: 52,
      spawnY: 48
    });
    
    if (!connectionSuccess) {
      throw new Error("Échec de connexion à la WorldRoom via NetworkManager");
    }
    
    window.currentGameRoom = window.globalNetworkManager.room;
    TimeService.getInstance().connectToRoom(window.currentGameRoom);

    await initializeGlobalWeatherSystem();
    const sceneRegistry = await initializeSceneSystem();
    
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    initPokeChat(worldChat, window.username);

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
        window.extendedLoadingScreen.show('extended');
        
        setTimeout(() => {
          window.game = new Phaser.Game(config);
        }, 1000);
        
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
        window.game.sound.context.resume();
      }
      document.removeEventListener('click', resumeAudioContext);
    }, { once: true });
    
    window.battleSystem = new BattleIntegration(window);

    setTimeout(async () => {
      try {
        const hasGame = !!window.game;
        const hasNetworkManager = !!window.globalNetworkManager;
        const hasRoom = !!window.currentGameRoom;
        const networkConnected = window.globalNetworkManager?.isConnected;
        
        if (hasGame && hasNetworkManager && hasRoom && networkConnected) {
          window.battleSystem = new BattleIntegration(window);
          await window.battleSystem.initialize(window.globalNetworkManager.room, window.game);
        }
      } catch (error) {
        console.error("❌ Erreur initialisation système de combat:", error);
      }
    }, 5000);

    window.starterHUD = null;
    window.inventorySystemGlobal = null;
    window.encounterManagerGlobal = null;

    window.initEncounterSystem = function(scene, mapData = null) {
      if (scene && scene.encounterManager && scene.encounterInitialized) {
        return scene.encounterManager;
      }
      
      try {
        const encounterManager = new ClientEncounterManager();
        
        if (mapData) {
          encounterManager.loadMapData(mapData);
        } else if (scene && scene.map) {
          const mapKey = scene.mapKey || scene.scene.key.toLowerCase();
          const tilemapData = scene.cache?.tilemap?.get(mapKey);
          if (tilemapData && tilemapData.data) {
            encounterManager.loadMapData(tilemapData.data);
          }
        }
        
        window.encounterManagerGlobal = encounterManager;
        
        if (scene) {
          scene.encounterManager = encounterManager;
          scene.encounterInitialized = true;
        }
        
        if (typeof window.onSystemInitialized === 'function') {
          window.onSystemInitialized('encounters');
        }
        
        return encounterManager;
        
      } catch (error) {
        console.error('❌ Erreur initialisation système d\'encounters:', error);
        return null;
      }
    };

    window.initBattleSystem = function(gameRoom) {
      if (window.battleSystem && window.battleSystem.isInitialized) {
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
            if (success && typeof window.onSystemInitialized === 'function') {
              window.onSystemInitialized('battle');
            }
          });
        }
        
        return window.battleSystem;
        
      } catch (error) {
        console.error('❌ Erreur initialisation système de combat:', error);
        return null;
      }
    };

    window.globalLoadingScreen = LoadingScreen.createGlobal({
      enabled: true,
      fastMode: false,
      theme: 'uiInit'
    });
    
    window.initializePokemonUI = async function() {
      try {
        await window.globalLoadingScreen.showUIInitLoading();
        
        const uiResult = await initializePokemonUI();
        
        if (uiResult.success) {
          window.showGameNotification?.("Interface utilisateur prête !", "success", { 
            duration: 2000, 
            position: 'bottom-center' 
          });
        } else {
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

    window.setUIGameState = function(stateName, options = {}) {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.setGameState(stateName, options);
      } else {
        return false;
      }
    };

    window.showUIModule = function(moduleId, options = {}) {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.showModule(moduleId, options);
      } else {
        return false;
      }
    };

    window.hideUIModule = function(moduleId, options = {}) {
      if (window.pokemonUISystem) {
        return window.pokemonUISystem.hideModule(moduleId, options);
      } else {
        return false;
      }
    };

    window.getUIModuleState = function(moduleId) {
      if (window.pokemonUISystem && window.uiManager) {
        return window.uiManager.getModuleState(moduleId);
      } else {
        return null;
      }
    };
    
  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    window.showGameAlert?.(`Erreur: ${e.message}`) || alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

export default {};

// === UTILITY FUNCTIONS ===

window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};

window.isStarterHUDOpen = function() {
  return window.starterHUD ? window.starterHUD.isVisible : false;
};

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

// UI Control Functions
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
  
  const questElements = document.querySelectorAll('#quest-journal-overlay, .quest-journal-overlay');
  questElements.forEach(el => {
    if (el.style) {
      el.style.display = 'none';
    }
  });
};

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
  
  const teamElements = document.querySelectorAll('#team-overlay, .team-overlay');
  teamElements.forEach(el => {
    if (el.style) {
      el.style.display = 'none';
    }
  });
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
  }
};

window.openInventory = function() {
  if (window.inventorySystemGlobal) {
    window.inventorySystemGlobal.openInventory();
    window.showGameNotification("Inventaire ouvert", "info", { duration: 1500, position: 'bottom-right' });
  }
};

// Starter functions
window.showStarterSelection = function(availableStarters = null) {
  return StarterUtils.showSelection(availableStarters);
};

window.hideStarterSelection = function() {
  StarterUtils.hideSelection();
};

window.isStarterSelectionActive = function() {
  return StarterUtils.isActive();
};

// Status function
window.getGameSystemsStatus = function() {
  const status = {
    chat: { initialized: !!window.pokeChat, focused: window.isChatFocused() },
    inventory: { initialized: !!window.inventorySystemGlobal, open: window.isInventoryOpen() },
    
    quests: { 
      initialized: !!(window.pokemonUISystem?.getOriginalModule?.('quest')),
      journalOpen: window.isQuestJournalOpen(),
      newSystem: true,
      oldSystemRemoved: true
    },
    
    starter: { initialized: !!window.starterHUD, open: window.isStarterHUDOpen() },
    
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
