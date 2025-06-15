// src/main.js - Avec votre map Pokemon
import Phaser from "phaser";
import { LoaderScene } from './scenes/LoaderScene.js';
import { MapLoaderScene } from "./scenes/MapLoaderScene.js";

// 🔒 Récupération ou demande du pseudo utilisateur
let username = localStorage.getItem('username');
if (!username) {
  username = prompt("Choisis un pseudo :");
  if (!username || username.trim() === "") {
    alert("Un pseudo est obligatoire pour jouer !");
    throw new Error("Aucun pseudo fourni.");
  }
  localStorage.setItem('username', username);
}
window.username = username; // Pour y accéder globalement

// Configuration Phaser style PokeMMO
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',

  // Configuration pixel art
  pixelArt: true,
  roundPixels: true,
  antialias: false,

  scene: [MapLoaderScene], // l'ordre est important

  // Physique pour RPG
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  // Rendu pixel perfect
  render: {
    pixelArt: true,
    roundPixels: true
  },

  // Mise à l'échelle
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Créer le jeu
const game = new Phaser.Game(config);

// Gestion des erreurs
window.addEventListener('error', (event) => {
  console.error('❌ Game error:', event.error);
});

// Nettoyage
window.addEventListener('beforeunload', () => {
  if (game) {
    game.destroy(true);
  }
});

console.log("🚀 PokeMMO with Pokemon maps started!");
