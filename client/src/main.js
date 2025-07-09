import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { setupTeamSystem } from './integration/teamIntegration.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { StarterUtils } from './components/StarterSelector.js';
import { createTeamUIIntegration } from './components/TeamUIIntegration.js';

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
import { initializeGameNotifications, showNotificationInstructions } from './notification.js';
import { initializePokemonUI } from './ui.js';
import './debug-notifications.js';
import { ClientEncounterManager } from './managers/EncounterManager.js';
import { BattleIntegration } from './managers/BattleIntegration.js';
import { BattleScene } from './scenes/BattleScene.js';

// === CONFIGURATION ===
const ENDPOINT = (location.protocol === "https:" ? "wss://" : "ws://") + location.hostname + (location.port ? ":" + location.port : "") + "/ws";

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
    WraithmoorCimeteryScene
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

// === CSS STARTER ===
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

// === INITIALISATIONS ===
async function initializeSceneSystem() {
  console.log("🏗️ [MAIN] Initialisation système de scènes");
  
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
  
  window.listAvailableZones = function() {
    return registry.getAvailableZones();
  };
  
  return registry;
}

async function initializeGlobalWeatherSystem() {
  console.log("🌤️ [MAIN] Initialisation système météo global");
  
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
          console.warn("⚠️ [MAIN] Système météo pas prêt");
          return false;
        }
        return globalWeatherManager.registerScene(scene, zoneName);
      };
      
      console.log("✅ [MAIN] Système météo global initialisé");
    } else {
      throw new Error("Échec initialisation GlobalWeatherManager");
    }
    
  } catch (error) {
    console.error("❌ [MAIN] Erreur système météo:", error);
    
    window.globalWeatherManager = {
      isInitialized: false,
      getCurrentWeather: () => ({ weather: 'clear', displayName: 'Ciel dégagé' }),
      getCurrentTime: () => ({ hour: 12, isDayTime: true }),
      registerScene: () => false
    };
    
    window.getGlobalWeather = () => ({ weather: 'clear', displayName: 'Ciel dégagé' });
    window.getGlobalTime = () => ({ hour: 12, isDayTime: true });
    window.registerSceneToWeather = () => false;
  }
}

// === BATTLE SYSTEM INITIALIZATION ===
window.initBattleSystemWhenReady = async function() {
  try {
    console.log("🔧 [MAIN] Vérification pré-requis système de combat");
    
    const checks = {
      hasGame: !!window.game,
      hasNetworkManager: !!window.globalNetworkManager,
      hasRoom: !!window.currentGameRoom,
      networkConnected: window.globalNetworkManager?.isConnected,
      scenesReady: window.game?.scene?.manager?.scenes?.length > 3,
      noBattleSystemYet: !window.battleSystem
    };
    
    console.log("📊 [MAIN] Pré-requis:", checks);
    
    if (!Object.values(checks).every(check => check === true)) {
      const missing = Object.entries(checks)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
      console.log(`⚠️ [MAIN] Pré-requis manquants: ${missing.join(', ')}`);
      return false;
    }

    // Ajouter BattleScene dynamiquement
    if (!window.game.scene.getScene('BattleScene')) {
      console.log("🎬 [MAIN] Ajout dynamique BattleScene");
      window.game.scene.add('BattleScene', BattleScene, false);
    }

    console.log("🚀 [MAIN] Initialisation BattleSystem");
    window.battleSystem = new BattleIntegration(window);
    const battleInitSuccess = await window.battleSystem.initialize(
      window.globalNetworkManager.room,
      window.game
    );
    
    if (battleInitSuccess) {
      console.log("✅ [MAIN] Système de combat initialisé");
      return true;
    } else {
      console.error("❌ [MAIN] Échec initialisation BattleSystem");
      return false;
    }
    
  } catch (error) {
    console.error("❌ [MAIN] Erreur initialisation combat:", error);
    return false;
  }
};

// === SYSTÈMES DE BASE ===
window.initEncounterSystem = function(scene, mapData = null) {
  console.log('🎲 [MAIN] Initialisation système encounters');
  
  if (scene?.encounterManager && scene.encounterInitialized) {
    console.log('ℹ️ [MAIN] Système encounters déjà initialisé');
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
    
    console.log('✅ [MAIN] Système encounters initialisé');
    return encounterManager;
    
  } catch (error) {
    console.error('❌ [MAIN] Erreur encounters:', error);
    return null;
  }
};

window.forceInitTeamSystem = function(gameRoom) {
  console.log('🔧 [MAIN] Force init système équipe');
  
  if (window.teamManagerGlobal?.destroy) {
    window.teamManagerGlobal.destroy();
  }
  window.teamManagerGlobal = null;
  
  try {
    window.teamManagerGlobal = setupTeamSystem(gameRoom || window.currentGameRoom);
    
    if (window.teamManagerGlobal) {
      console.log('✅ [MAIN] Système équipe initialisé');
      return window.teamManagerGlobal;
    } else {
      console.error('❌ [MAIN] Échec init équipe');
      return null;
    }
    
  } catch (error) {
    console.error('❌ [MAIN] Erreur init équipe:', error);
    return null;
  }
};

// === PATCH QUEST SYSTEM ===
if (!window.questSystemGlobal) {
  window.questSystemGlobal = {
    openQuestJournal: () => { alert("Journal de quêtes non dispo !"); },
    isQuestJournalOpen: () => false,
    canPlayerInteract: () => true
  };
}

// === UTILITY FUNCTIONS ===
window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};

window.isInventoryOpen = function() {
  if (window.inventorySystemGlobal) return window.inventorySystemGlobal.isInventoryOpen();
  return false;
};

window.isTeamOpen = function() {
  return window.teamManagerGlobal ? window.teamManagerGlobal.teamUI?.isOpen() || false : false;
};

window.shouldBlockInput = function() {
  return window.isChatFocused() ||
    window.isInventoryOpen() ||
    window.isTeamOpen();
};

window.canPlayerInteract = function() {
  return !window.shouldBlockInput();
};

// === FONCTIONS PRINCIPALES ===
window.toggleInventory = function() {
  if (window.pokemonUISystem?.getOriginalModule) {
    const inventoryModule = window.pokemonUISystem.getOriginalModule('inventory');
    if (inventoryModule?.toggleInventory) {
      inventoryModule.toggleInventory();
      return;
    }
  }
  
  if (window.inventorySystemGlobal) {
    window.inventorySystemGlobal.toggleInventory();
  }
};

window.toggleTeam = function() {
  if (window.pokemonUISystem?.getOriginalModule) {
    const teamModule = window.pokemonUISystem.getOriginalModule('team');
    if (teamModule?.toggleTeamUI) {
      teamModule.toggleTeamUI();
      return;
    }
  }
  
  if (window.teamManagerGlobal) {
    window.teamManagerGlobal.toggleTeamUI();
  }
};

window.testBattle = function() {
  if (!window.battleSystem?.isInitialized) {
    console.log("❌ Système de combat non initialisé");
    return;
  }

  const result = window.battleSystem.test ? window.battleSystem.test() : window.battleSystem.testBattle?.();
  
  if (result) {
    console.log("✅ Combat de test démarré");
  }
};

window.startWildBattle = function(pokemonData = null) {
  if (!window.battleSystem?.isInitialized) {
    console.log("❌ Système de combat non prêt");
    return false;
  }

  const testPokemon = pokemonData || {
    pokemonId: 25,
    level: 5,
    name: 'Pikachu',
    shiny: false,
    gender: 'male'
  };

  return window.battleSystem.startWildBattle({
    pokemon: testPokemon,
    location: 'test_zone',
    method: 'manual'
  });
};

// === CONTRÔLES CLAVIER ===
document.addEventListener('keydown', (event) => {
  if (window.shouldBlockInput()) return;
  
  switch (event.key.toLowerCase()) {
    case 'i':
      event.preventDefault();
      window.toggleInventory();
      break;
    case 't':
      event.preventDefault();
      window.toggleTeam();
      break;
    case 'b':
      event.preventDefault();
      window.testBattle();
      break;
  }
});

// === INITIALISATION PRINCIPALE ===
(async () => {
  try {
    console.log("🚀 [MAIN] Démarrage PokeWorld MMO");
    
    // Notifications
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Notifications initialisées");
    
    // NetworkManager
    console.log("🌐 Connexion NetworkManager");
    window.globalNetworkManager = new NetworkManager(client, window.username);
    
    const connectionSuccess = await window.globalNetworkManager.connect("beach", {
      spawnX: 52,
      spawnY: 48
    });
    
    if (!connectionSuccess) {
      throw new Error("Échec connexion WorldRoom");
    }
    
    window.currentGameRoom = window.globalNetworkManager.room;
    console.log("✅ Connecté WorldRoom:", window.currentGameRoom.sessionId);
    
    // TimeService
    TimeService.getInstance().connectToRoom(window.currentGameRoom);
    
    // Météo
    await initializeGlobalWeatherSystem();
    
    // Scènes
    await initializeSceneSystem();
    
    // Chat
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    initPokeChat(worldChat, window.username);
    console.log("✅ WorldChat connecté");

    // Phaser
    console.log("🎮 Lancement Phaser");
    setTimeout(() => {
      window.game = new Phaser.Game(config);
      
      setTimeout(() => {
        if (window.showGameNotification) {
          window.showGameNotification("🌍 PokeWorld MMO chargé !", "success", { 
            duration: 3000, 
            position: 'top-center' 
          });
        }
      }, 2000);
    }, 1000);

    // Audio Context
    document.addEventListener('click', function resumeAudioContext() {
      if (window.game?.sound?.context?.state === 'suspended') {
        window.game.sound.context.resume();
      }
      document.removeEventListener('click', resumeAudioContext);
    }, { once: true });
    
    // Battle System avec retry
    let battleInitAttempts = 0;
    const maxBattleInitAttempts = 15;
    const retryDelay = 1000;

    const tryInitBattle = async () => {
      battleInitAttempts++;
      console.log(`🔄 [MAIN] Tentative BattleSystem ${battleInitAttempts}/${maxBattleInitAttempts}`);
      
      const success = await window.initBattleSystemWhenReady();
      
      if (success) {
        console.log(`🎯 [MAIN] BattleSystem initialisé après ${battleInitAttempts} tentatives`);
      } else if (battleInitAttempts < maxBattleInitAttempts) {
        setTimeout(tryInitBattle, retryDelay);
      } else {
        console.warn(`⚠️ [MAIN] Abandon BattleSystem après ${maxBattleInitAttempts} tentatives`);
      }
    };

    setTimeout(tryInitBattle, 2000);

    // Systèmes de base
    window.forceInitTeamSystem(window.currentGameRoom);
    
    // UI Pokémon
    window.initializePokemonUI = async function() {
      console.log("🚀 [MAIN] Initialisation Pokémon UI");
      
      try {
        const uiResult = await initializePokemonUI();
        
        if (uiResult.success) {
          console.log("✅ Système UI Pokémon initialisé");
          if (window.showGameNotification) {
            window.showGameNotification("Interface prête !", "success", { 
              duration: 2000, 
              position: 'bottom-center' 
            });
          }
        }
        
        return uiResult;
        
      } catch (error) {
        console.error("❌ Erreur UI Pokémon:", error);
        return { success: false, error: error.message };
      }
    };

    // Team UI Integration
    setTimeout(async () => {
      let attempts = 0;
      const maxAttempts = 20;
      
      const waitForUI = async () => {
        attempts++;
        
        if (window.pokemonUISystem && window.globalNetworkManager?.room) {
          console.log("✅ [MAIN] Intégration TeamUI");
          
          try {
            if (!window.pokemonUISystem) {
              throw new Error("PokemonUISystem requis");
            }
            
            const uiManager = window.pokemonUISystem.uiManager || window.uiManager;
            if (!uiManager) {
              throw new Error("UIManager non disponible");
            }
            
            const teamIntegration = await createTeamUIIntegration(
              uiManager, 
              window.globalNetworkManager.room
            );
            
            window.teamUIIntegration = teamIntegration;
            
            window.openTeamUI = function() {
              return uiManager.showModule('teamUI');
            };
            
            window.closeTeamUI = function() {
              return uiManager.hideModule('teamUI');
            };
            
            window.toggleTeamUI = function() {
              return uiManager.toggleModule('teamUI');
            };
            
            if (window.showGameNotification) {
              window.showGameNotification("Team UI intégré !", "success", { 
                duration: 3000, 
                position: 'bottom-center' 
              });
            }
            
          } catch (error) {
            console.error("❌ [MAIN] Erreur TeamUI:", error);
          }
          
        } else if (attempts < maxAttempts) {
          setTimeout(waitForUI, 1000);
        } else {
          console.warn("⚠️ [MAIN] Timeout TeamUI - fallback");
          
          window.toggleTeamUI = function() {
            if (window.teamManagerGlobal) {
              window.teamManagerGlobal.toggleTeamUI();
            }
          };
        }
      };
      
      waitForUI();
    }, 8000);

    showNotificationInstructions();
    
    console.log("🎯 [MAIN] Tous les systèmes initialisés");
    console.log("🎮 Contrôles: I=Inventaire, T=Équipe, B=Test Combat");
    
  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

export default {};
