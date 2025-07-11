import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { NetworkManager } from "./network/NetworkManager.js";
import { LoadingScreen } from './components/LoadingScreen.js';
import { SceneRegistry } from './scenes/SceneRegistry.js';
import { TimeService } from './services/TimeService.js';
import { globalWeatherManager } from './managers/GlobalWeatherManager.js';
import { ClientEncounterManager } from './managers/EncounterManager.js';
import { BattleIntegration } from './managers/BattleIntegration.js';
import { initializeGameNotifications } from './notification.js';
import { initializePokemonUI } from './ui.js';
import { initPokeChat } from './network/PokeChatSystem.js';

// Scene imports
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
import { BattleScene } from './scenes/BattleScene.js';

import { Client } from 'colyseus.js';

// Connection setup
const ENDPOINT =
  (location.protocol === "https:" ? "wss://" : "ws://") +
  location.hostname +
  (location.port ? ":" + location.port : "") +
  "/ws";

const client = new Client(ENDPOINT);
window.client = client;

// User authentication
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

// Scene system initialization
async function initializeSceneSystem() {
  console.log("🏗️ Initialisation système de scènes...");
  
  const registry = SceneRegistry.getInstance();
  
  // Register scene classes
  registry.registerSceneClass('beach', BeachScene);
  registry.registerSceneClass('village', VillageScene);
  registry.registerSceneClass('villagelab', VillageLabScene);
  registry.registerSceneClass('road1', Road1Scene);
  registry.registerSceneClass('villagehouse1', VillageHouse1Scene);
  registry.registerSceneClass('lavandia', LavandiaScene);
  
  window.sceneRegistry = registry;
  
  // Global scene management functions
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
  
  console.log("✅ Système de scènes initialisé");
  return registry;
}

// Weather system initialization
async function initializeGlobalWeatherSystem() {
  console.log("🌤️ Initialisation système météo global...");
  
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
        return globalWeatherManager.registerScene(scene, zoneName);
      };
      
      console.log("✅ Système météo global initialisé");
    } else {
      throw new Error("Échec initialisation GlobalWeatherManager");
    }
    
  } catch (error) {
    console.error("❌ Erreur système météo:", error);
    
    // Fallback weather system
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

// Encounter system initialization
window.initEncounterSystem = function(scene, mapData = null) {
  console.log('🎲 Initialisation système encounters...');
  
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
    
    console.log('✅ Système encounters initialisé');
    return encounterManager;
    
  } catch (error) {
    console.error('❌ Erreur système encounters:', error);
    return null;
  }
};

// Battle system initialization
window.initBattleSystem = function(gameRoom) {
  console.log('⚔️ Initialisation système de combat...');
  
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
    console.error('❌ Erreur système de combat:', error);
    return null;
  }
};

// Phaser configuration
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

// Main initialization
(async () => {
  try {
    console.log("🚀 Démarrage PokeWorld MMO...");
    
    // Initialize notification system
    const notificationSystem = initializeGameNotifications();
    console.log("✅ Système de notification initialisé");
    
    // Initialize network manager
    console.log("🌐 Connexion au serveur...");
    window.globalNetworkManager = new NetworkManager(client, window.username);
    
    const connectionSuccess = await window.globalNetworkManager.connect("beach", {
      spawnX: 52,
      spawnY: 48
    });
    
    if (!connectionSuccess) {
      throw new Error("Échec de connexion à la WorldRoom");
    }
    
    window.currentGameRoom = window.globalNetworkManager.room;
    console.log("✅ Connecté au serveur");
    
    // Connect time service
    TimeService.getInstance().connectToRoom(window.currentGameRoom);
    
    // Initialize weather system
    await initializeGlobalWeatherSystem();
    
    // Initialize scene system
    await initializeSceneSystem();
    
    // Connect to world chat
    console.log("💬 Connexion chat mondial...");
    const worldChat = await client.joinOrCreate("worldchat", { username });
    window.worldChat = worldChat;
    initPokeChat(worldChat, window.username);
    console.log("✅ Chat mondial connecté");
    
    // Show loading screen
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
    
    // Start loading and game
    window.extendedLoadingScreen.show('extended');
    
    setTimeout(() => {
      console.log("🎮 Lancement Phaser...");
      window.game = new Phaser.Game(config);
    }, 1000);
    
    // Audio context setup
    document.addEventListener('click', function resumeAudioContext() {
      if (window.game?.sound?.context?.state === 'suspended') {
        window.game.sound.context.resume().then(() => {
          console.log('🔊 AudioContext resumed');
        });
      }
      document.removeEventListener('click', resumeAudioContext);
    }, { once: true });
    
    // Initialize battle system after delay
    setTimeout(async () => {
      try {
        if (window.game && window.globalNetworkManager?.isConnected) {
          window.battleSystem = new BattleIntegration(window);
          const battleInitSuccess = await window.battleSystem.initialize(
            window.globalNetworkManager.room,
            window.game
          );
          if (battleInitSuccess) {
            console.log("✅ Système de combat initialisé");
          }
        }
      } catch (error) {
        console.error("❌ Erreur initialisation combat:", error);
      }
    }, 5000);
    
    // Initialize Pokemon UI system
    window.initializePokemonUI = async function() {
      console.log("🎮 Initialisation interface Pokémon...");
      
      try {
        const uiResult = await initializePokemonUI();
        
        if (uiResult.success) {
          console.log("✅ Interface Pokémon initialisée");
          window.showGameNotification?.("Interface utilisateur prête !", "success", { 
            duration: 2000, 
            position: 'bottom-center' 
          });
        } else {
          console.error("❌ Erreur interface Pokémon:", uiResult.error);
        }
        
        return uiResult;
        
      } catch (error) {
        console.error("❌ Erreur critique interface:", error);
        return { success: false, error: error.message };
      }
    };
    
    console.log("🎯 PokeWorld MMO initialisé avec succès !");
    
  } catch (e) {
    console.error("❌ Erreur d'initialisation:", e);
    alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

// Utility functions for input management
window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};

window.isInventoryOpen = function() {
  if (window.pokemonUISystem) {
    const inventoryModule = window.pokemonUISystem.getOriginalModule('inventory');
    return inventoryModule?.isInventoryOpen() || false;
  }
  return false;
};

window.isTeamOpen = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule('team');
    return teamModule?.isTeamOpen() || false;
  }
  return false;
};

window.isQuestJournalOpen = function() {
  if (window.pokemonUISystem) {
    const questModule = window.pokemonUISystem.getOriginalModule('quest');
    return questModule?.isQuestJournalOpen() || false;
  }
  return false;
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
    window.isInventoryOpen() ||
    window.isTeamOpen() ||
    window.isQuestJournalOpen() ||
    window.isBattleActive();
};

window.canPlayerInteract = function() {
  return !window.shouldBlockInput();
};

// UI management functions
window.toggleInventory = function() {
  if (window.pokemonUISystem) {
    const inventoryModule = window.pokemonUISystem.getOriginalModule('inventory');
    if (inventoryModule?.toggleInventory) {
      inventoryModule.toggleInventory();
    }
  }
};

window.toggleTeam = function() {
  if (window.pokemonUISystem) {
    const teamModule = window.pokemonUISystem.getOriginalModule('team');
    if (teamModule?.toggleTeamUI) {
      teamModule.toggleTeamUI();
    }
  }
};

window.toggleQuests = function() {
  if (window.pokemonUISystem) {
    const questModule = window.pokemonUISystem.getOriginalModule('quest');
    if (questModule?.toggleQuestJournal) {
      questModule.toggleQuestJournal();
    }
  }
};

// Battle functions
window.testBattle = function() {
  if (!window.battleSystem?.isInitialized) {
    console.error('❌ Système de combat non initialisé');
    return false;
  }
  
  return window.battleSystem.test();
};

window.startWildBattle = function(pokemonData = null) {
  if (!window.battleSystem?.isInitialized) {
    console.error('❌ Système de combat non prêt');
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

// Keyboard controls
document.addEventListener('keydown', (event) => {
  if (window.shouldBlockInput()) return;

  // Only handle UI keys, not movement keys (wasd/zqsd)
  const movementKeys = ['w', 'a', 's', 'd', 'z', 'q', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
  const keyLower = event.key.toLowerCase();
  
  // Don't prevent movement keys
  if (movementKeys.includes(keyLower)) {
    return;
  }

  switch (keyLower) {
    case 'i':
      event.preventDefault();
      window.toggleInventory();
      break;
    case 't':
      event.preventDefault();
      window.toggleTeam();
      break;
    case 'j': // Changed from 'q' to 'j' for quest journal (J for Journal)
      event.preventDefault();
      window.toggleQuests();
      break;
    case 'b':
      event.preventDefault();
      window.testBattle();
      break;
    case 'f':
      event.preventDefault();
      const activeScene = window.game?.scene?.getScenes(true)[0];
      if (activeScene?.debugEncounters) {
        activeScene.debugEncounters();
      }
      break;
    case 'g':
      event.preventDefault();
      const currentScene = window.game?.scene?.getScenes(true)[0];
      if (currentScene?.forceEncounterTest) {
        currentScene.forceEncounterTest();
      }
      break;
  }
});

console.log(`
🎉 === POKÉMON MMO PRÊT ===
Contrôles:
• I - Inventaire
• T - Équipe
• J - Quêtes (Journal)
• B - Test combat
• F - Debug encounters
• G - Force encounter
• WASD/ZQSD - Déplacement
========================
`);

export default {};
