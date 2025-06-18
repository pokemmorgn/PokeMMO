import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles/dist/AnimatedTiles.js';
import { LoaderScene } from "./scenes/LoaderScene.js";
import { BeachScene } from "./scenes/zones/BeachScene.js";
import { VillageScene } from "./scenes/zones/VillageScene.js";
import { Road1Scene } from './scenes/zones/Road1Scene.js';
import { VillageLabScene } from './scenes/zones/VillageLabScene.js';
import { VillageHouse1Scene } from './scenes/zones/VillageHouse1Scene.js';
import { LavandiaScene } from './scenes/zones/LavandiaScene.js';

// === AJOUT Colyseus.js ===
import { Client } from 'colyseus.js';

// Pour debug local, change le port/endpoint si besoin !
const ENDPOINT = location.protocol.replace("http", "ws") + '//' + location.hostname + ':2567';
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
window.game = game; // Pour debug si besoin

// ==== Connexion à Colyseus + gestion chat ====

let room = null;

(async () => {
  try {
    // Change "pokeworld" si ton nom de room est différent
    room = await colyseus.joinOrCreate("pokeworld", { username: window.username });
    window.room = room;
    console.log("✅ Connecté à la room Colyseus");

    // Ajoute l’écouteur pour recevoir les messages de chat
    room.onMessage("chat", data => addChatMessage(data));
  } catch (e) {
    alert("Impossible de rejoindre le serveur : " + e.message);
    throw e;
  }
})();

// Gestion envoi du chat
const chatInput = document.getElementById("chat-input");
chatInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && chatInput.value.trim() && room) {
    room.send("chat", { message: chatInput.value });
    chatInput.value = "";
  }
});

// Affichage d’un message dans le chat
function addChatMessage({ author, message }) {
  const chatMessages = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.innerHTML = `<b style="color:#8cf;">${author}:</b> ${message}`;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export default game;
