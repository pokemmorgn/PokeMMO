// src/camera/CameraManager.js - Style PokeMMO (caméra centrée sur joueur)
import { GAME_CONFIG } from "../config/gameConfig.js";

export class CameraManager {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.target = null;
    
    this.setupCamera();
  }

  setupCamera() {
    // Configuration de base de la caméra
    this.camera.setZoom(GAME_CONFIG.camera.zoom);
    this.camera.setRoundPixels(true);
    
    console.log("📷 Camera manager initialized (center on player mode)");
  }

  // Définir les limites de la caméra basées sur la tilemap
  setBounds(map) {
    const mapWidthInPixels = map.widthInPixels;
    const mapHeightInPixels = map.heightInPixels;
    
    this.camera.setBounds(0, 0, mapWidthInPixels, mapHeightInPixels);
    console.log(`📏 Camera bounds set to: ${mapWidthInPixels}x${mapHeightInPixels}`);
  }

  // Fixer la cible (joueur)
  followPlayer(player) {
    this.target = player;
    console.log("🎯 Camera will center on player");
  }

  // Mettre à jour la caméra : on centre directement sur le joueur
  update() {
    if (this.target) {
      this.camera.centerOn(
        Math.round(this.target.x),
        Math.round(this.target.y)
      );
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

  // Effets caméra
  shake(duration = 100, intensity = 0.01) {
    this.camera.shake(duration, intensity);
  }

  flash(duration = 250, red = 255, green = 255, blue = 255) {
    this.camera.flash(duration, red, green, blue);
  }

  fade(duration = 1000, red = 0, green = 0, blue = 0) {
    return new Promise(resolve => {
      this.camera.fade(duration, red, green, blue);
      this.camera.once('camerafadeoutcomplete', resolve);
    });
  }

  panTo(x, y, duration = 1000) {
    return new Promise(resolve => {
      this.camera.pan(x, y, duration, 'Power2');
      this.camera.once('camerapancomplete', resolve);
    });
  }

  stopFollow() {
    this.target = null;
  }

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

  screenToWorld(screenX, screenY) {
    return this.camera.getWorldPoint(screenX, screenY);
  }

  isPointVisible(worldX, worldY) {
    return this.camera.worldView.contains(worldX, worldY);
  }

  destroy() {
    this.target = null;
  }
}