// src/input/InputManager.js
import { GAME_CONFIG } from "../config/gameConfig.js";

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.cursors = null;
    this.wasdKeys = null;
    this.callbacks = {
      onMove: null
    };
    
    this.setupInput();
  }

  setupInput() {
    // Create cursor keys
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    
    // Create WASD keys
    this.wasdKeys = this.scene.input.keyboard.addKeys('W,S,A,D');
    
    // Enable keyboard input
    this.scene.input.keyboard.enabled = true;
    this.scene.input.keyboard.enableGlobalCapture();
    
    console.log("⌨️ Input system initialized");
  }

  update(currentX, currentY) {
    const speed = GAME_CONFIG.player.speed;
    let newX = currentX;
    let newY = currentY;
    let moved = false;

    // Check arrow keys
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      newX -= speed;
      moved = true;
    }
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      newX += speed;
      moved = true;
    }
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      newY -= speed;
      moved = true;
    }
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      newY += speed;
      moved = true;
    }

    if (moved) {
      // Apply bounds - valeurs fixes pour l'instant
      newX = Math.max(16, Math.min(784, newX));
      newY = Math.max(16, Math.min(592, newY));
      
      // Trigger callback
      if (this.callbacks.onMove) {
        this.callbacks.onMove(newX, newY);
      }
    }

    return { moved, newX, newY };
  }

  onMove(callback) {
    this.callbacks.onMove = callback;
  }

  isKeyDown(key) {
    switch(key.toLowerCase()) {
      case 'left': return this.cursors.left.isDown || this.wasdKeys.A.isDown;
      case 'right': return this.cursors.right.isDown || this.wasdKeys.D.isDown;
      case 'up': return this.cursors.up.isDown || this.wasdKeys.W.isDown;
      case 'down': return this.cursors.down.isDown || this.wasdKeys.S.isDown;
      default: return false;
    }
  }

  destroy() {
    // Cleanup if needed
    this.callbacks = {};
  }
}