// src/camera/CameraManager.js - Style PokeMMO
import { GAME_CONFIG } from "../config/gameConfig.js";

export class CameraManager {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.target = null;
    this.cameraDolly = null; // Point pour mouvement fluide
    
    this.setupCamera();
  }

  setupCamera() {
    // Configuration de base de la caméra
    this.camera.setZoom(GAME_CONFIG.camera.zoom);
    this.camera.setRoundPixels(true);
    
    // Création d'un point "dolly" pour un mouvement fluide
    this.cameraDolly = new Phaser.Geom.Point(
      GAME_CONFIG.width / 2, 
      GAME_CONFIG.height / 2
    );
    
    console.log("📷 Camera manager initialized");
  }

  // Définir les limites de la caméra basées sur la tilemap
  setBounds(map) {
    const mapWidthInPixels = map.widthInPixels;
    const mapHeightInPixels = map.heightInPixels;
    
    this.camera.setBounds(0, 0, mapWidthInPixels, mapHeightInPixels);
    console.log(`📏 Camera bounds set to: ${mapWidthInPixels}x${mapHeightInPixels}`);
  }

  // Faire suivre un joueur par la caméra
  followPlayer(player) {
    this.target = player;
    
    // Configuration du suivi avec deadzone (comme PokeMMO)
    this.camera.startFollow(this.cameraDolly, true, 
      GAME_CONFIG.camera.lerp, 
      GAME_CONFIG.camera.lerp
    );
    
    // Deadzone pour éviter que la caméra bouge à chaque petit mouvement
    this.camera.setDeadzone(
      GAME_CONFIG.camera.deadzone.width, 
      GAME_CONFIG.camera.deadzone.height
    );
    
    console.log("🎯 Camera now following player");
  }

  // Mettre à jour la position du dolly (appelé dans update)
  update() {
    if (this.target && this.cameraDolly) {
      // Mouvement fluide avec des pixels arrondis (évite les tremblements)
      this.cameraDolly.x = Math.round(this.target.x);
      this.cameraDolly.y = Math.round(this.target.y);
    }
  }

  // Centrer immédiatement sur un point
  centerOn(x, y) {
    this.camera.centerOn(x, y);
  }

  // Effectuer un zoom (pour debug ou fonctionnalités spéciales)
  setZoom(zoom) {
    this.camera.setZoom(zoom);
  }

  // Shake effect (pour des événements spéciaux)
  shake(duration = 100, intensity = 0.01) {
    this.camera.shake(duration, intensity);
  }

  // Flash effect
  flash(duration = 250, red = 255, green = 255, blue = 255) {
    this.camera.flash(duration, red, green, blue);
  }

  // Fade effect
  fade(duration = 1000, red = 0, green = 0, blue = 0) {
    return new Promise(resolve => {
      this.camera.fade(duration, red, green, blue);
      this.camera.once('camerafadeoutcomplete', resolve);
    });
  }

  // Pan vers une position (pour cinématiques)
  panTo(x, y, duration = 1000) {
    return new Promise(resolve => {
      this.camera.pan(x, y, duration, 'Power2');
      this.camera.once('camerapancomplete', resolve);
    });
  }

  // Arrêter le suivi
  stopFollow() {
    this.camera.stopFollow();
    this.target = null;
  }

  // Obtenir les coordonnées du monde visibles par la caméra
  getWorldView() {
    return {
      left: this.camera.worldView.x,
      top: this.camera.worldView.y,
      right: this.camera.worldView.right,
      bottom: this.camera.worldView.bottom,
      centerX: this.camera.worldView.centerX,
      centerY: this.camera.worldView.centerY
    };
  }

  // Convertir coordonnées écran vers monde
  screenToWorld(screenX, screenY) {
    return this.camera.getWorldPoint(screenX, screenY);
  }

  // Vérifier si un point est visible par la caméra
  isPointVisible(worldX, worldY) {
    return this.camera.worldView.contains(worldX, worldY);
  }

  destroy() {
    this.target = null;
    this.cameraDolly = null;
  }
}