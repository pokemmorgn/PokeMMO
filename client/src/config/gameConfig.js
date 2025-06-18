// src/config/gameConfig.js - Style PokeMMO
export const GAME_CONFIG = {
  // Taille du canvas - style PokeMMO
  width: 800,
  height: 600,
  backgroundColor: "#000000", // Noir comme le vrai PokeMMO
  
  // Configuration pixel art
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  
server: {
  url: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
  roomName: ""
},
  
  // Configuration de la caméra - style top-down RPG
  camera: {
    lerp: 0.1, // Lissage du mouvement de caméra
    deadzone: {
      width: 64,
      height: 64
    },
    zoom: 2, // Zoom x2 pour pixel art
    bounds: true // La caméra reste dans les limites de la map
  },
  
  // Configuration des tiles
  tilemap: {
    tileSize: 32, // Taille des tiles (32x32 pixels)
    mapWidth: 25, // Largeur en tiles
    mapHeight: 19, // Hauteur en tiles
    layers: {
      background: "background",
      collision: "collision",
      foreground: "foreground"
    }
  },
  
  // Configuration du joueur
  player: {
    speed: 2, // Vitesse réduite pour mouvement plus réaliste
    size: 32,
    colors: {
      self: 0x00ff00,    // Vert pour soi
      others: 0xff6b6b   // Rouge pour les autres
    },
    // Limites de mouvement
    bounds: {
      minX: 16,
      maxX: 784, // 800 - 16
      minY: 16,
      maxY: 592  // 608 - 16
    },
    // Animation par tiles (mouvement case par case)
    tileMovement: true,
    animationDuration: 200 // ms pour se déplacer d'une case
  },
  
  // Interface utilisateur
  ui: {
    nameLabel: {
      fontSize: '14px',
      fontFamily: 'monospace', // Police pixel
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 3 },
      offsetY: -40
    },
    
    // HUD comme PokeMMO
    hud: {
      enabled: true,
      minimap: {
        size: 150,
        position: { x: 10, y: 10 },
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      },
      playerInfo: {
        position: { x: 10, y: 550 },
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      }
    }
  },
  
  // Physique
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // Pas de gravité pour un RPG top-down
      debug: false,
      tileBias: 32
    }
  }
};
