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

// === Chat System ===
import PokeChatSystem from './network/PokeChatSystem.js';

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

const game = new Phaser.Game(config);
window.game = game;

// ==== Connexion Colyseus + Chat ====

let worldChat = null;
let pokeChat = null;

(async () => {
  try {
    // Connexion à la WorldChatRoom
    worldChat = await colyseus.joinOrCreate("worldchat", { username: window.username });
    window.worldChat = worldChat;
    console.log("✅ Connecté à la WorldChatRoom");

    // Initialise le chat stylé après avoir rejoint la room
    pokeChat = new PokeChatSystem(worldChat, window.username);
    window.pokeChat = pokeChat;

    // --- SUPPRIMÉ L'EVENT LISTENER DUPLIQUÉ ---
    // Le PokeChatSystem gère déjà le toggle dans sa classe

    // Réception des messages du serveur
    worldChat.onMessage("chat", data => {
      // data: { author, message, timestamp, type }
      pokeChat.addMessage(
        data.author,
        data.message,
        data.timestamp,
        data.type || "normal"
      );
    });

    // ======== MESSAGES AUTOMATIQUES (simulateActivity) ========
    // Bienvenue
    pokeChat.addMessage('System', '🎮 Welcome to PokeWorld! Press T to test NPC dialogue.', null, 'system');
    pokeChat.addMessage('KantoTrainer', 'Anyone up for a battle? <span class="pokemon-emoji">⚡</span>', null, 'normal');
    
    // Messages de tournoi, etc.
    setTimeout(() => {
      pokeChat.addMessage('System', '🎉 Daily tournament starting in 10 minutes!', null, 'system');
    }, 15000);

    setTimeout(() => {
      pokeChat.addMessage('Professor_Oak', 'Welcome to the world of Pokémon! 🌟', null, 'normal');
    }, 3000);

    setTimeout(() => {
      pokeChat.addMessage('Nurse_Joy', 'Don\'t forget to heal your Pokémon regularly! 💊', null, 'normal');
    }, 8000);

    // --- EXEMPLE : simulate random system messages régulièrement
    setInterval(() => {
      if (!pokeChat) return;
      const tips = [
        "Tip: You can use Ctrl+M to minimize the chat.",
        "Tip: Trade safely, only with trusted players!",
        "Tip: Press T to open a dialogue with Professor Oak."
      ];
      const msg = tips[Math.floor(Math.random() * tips.length)];
      pokeChat.addMessage("System", msg, null, "system");
    }, 60000);

    // --- EXEMPLE : Simule le compteur online (optionnel)
    setInterval(() => {
      if (!pokeChat) return;
      // Fake random online count
      let n = Math.floor(Math.random() * 80) + 20;
      pokeChat.onlineCount.textContent = `🟢 ${n} online`;
    }, 10000);

  } catch (e) {
    alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

export default game;

// === FONCTION UTILITAIRE POUR LE JEU ===
// Utilisez cette fonction dans vos scènes Phaser pour vérifier si le chat a le focus
window.isChatFocused = function() {
  return window.pokeChat ? window.pokeChat.hasFocus() : false;
};
