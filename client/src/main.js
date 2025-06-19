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
      debug: false // Désactivé pour la production
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

/* Style pour les messages de succès */
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

// ==== Connexion Colyseus + Chat + Starter HUD + Quest System ====
(async () => {
  try {
    // Connexion à la WorldChatRoom
    const worldChat = await colyseus.joinOrCreate("worldchat", { username: window.username });
    window.worldChat = worldChat;
    console.log("✅ Connecté à la WorldChatRoom");

    // Initialise le chat stylé via le module séparé
    initPokeChat(worldChat, window.username);

    // === CONNEXION AU JEU ET INITIALISATION DES SYSTÈMES ===
    
    // Variables globales pour stocker les systèmes
    window.starterHUD = null;
    window.questSystemGlobal = null;
    
    // Fonction globale pour initialiser le HUD de starter (à appeler depuis vos scènes)
    window.initStarterHUD = function(gameRoom) {
      if (!window.starterHUD) {
        console.log("🎮 Initialisation du HUD de sélection de starter");
        window.starterHUD = new StarterSelectionHUD(gameRoom);
        
        // Écouter les événements additionnels si nécessaire
        gameRoom.onMessage("welcomeMessage", (data) => {
          console.log("📨 Message de bienvenue:", data.message);
        });
        
        return window.starterHUD;
      }
      return window.starterHUD;
    };

    // Fonction globale pour initialiser le système de quêtes
    window.initQuestSystem = function(scene, gameRoom) {
      if (!window.questSystemGlobal) {
        console.log("🎯 Initialisation du système de quêtes global");
        window.questSystemGlobal = new QuestSystem(scene, gameRoom);
        return window.questSystemGlobal;
      }
      return window.questSystemGlobal;
    };

    // Fonction pour déclencher manuellement la sélection de starter (pour les NPCs)
    window.showStarterSelection = function() {
      if (window.starterHUD) {
        window.starterHUD.show();
      } else {
        console.warn("⚠️ HUD de starter non initialisé");
      }
    };

    // === FONCTIONS GLOBALES POUR LES QUÊTES ===
    
    window.openQuestJournal = function() {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.openQuestJournal();
      } else {
        console.warn("⚠️ Système de quêtes non initialisé");
      }
    };

    window.triggerQuestCollect = function(itemId, amount = 1) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerCollectEvent(itemId, amount);
      }
    };

    window.triggerQuestDefeat = function(pokemonId) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerDefeatEvent(pokemonId);
      }
    };

    window.triggerQuestReach = function(zoneId, x, y, map) {
      if (window.questSystemGlobal) {
        window.questSystemGlobal.triggerReachEvent(zoneId, x, y, map);
      }
    };

    console.log("🎯 Système de starter et quêtes prêt !");
    console.log("📋 Utilisez 'Q' pour ouvrir le journal des quêtes en jeu");
    console.log("🎮 Utilisez window.initStarterHUD(room) et window.initQuestSystem(scene, room) dans vos scènes");

  } catch (e) {
    alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

export default game;

// === FONCTIONS UTILITAIRES POUR LE JEU ===

// Vérifier si le chat a le focus
window.isChatFocused = function() {
