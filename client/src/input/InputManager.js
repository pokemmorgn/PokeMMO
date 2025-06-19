// client/src/input/InputManager.js - Version mise à jour avec support mobile
import { GAME_CONFIG } from "../config/gameConfig.js";
import { MobileJoystick } from "./MobileJoystick.js";

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.cursors = null;
    this.wasdKeys = null;
    this.mobileJoystick = null;
    this.isMobile = this.detectMobile();
    
    this.callbacks = {
      onMove: null
    };

    // État du mouvement combiné (clavier + joystick)
    this.currentMovement = {
      x: 0,
      y: 0,
      isMoving: false,
      direction: null,
      source: null // 'keyboard' ou 'joystick'
    };
    
    this.setupInput();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  setupInput() {
    // Configuration du clavier (toujours disponible)
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasdKeys = this.scene.input.keyboard.addKeys('W,S,A,D');
    
    // Activer la capture globale du clavier
    this.scene.input.keyboard.enabled = true;
    this.scene.input.keyboard.enableGlobalCapture();
    
    // Configurer le joystick mobile si nécessaire
    if (this.isMobile || this.shouldShowJoystick()) {
      this.setupMobileJoystick();
    }
    
    console.log(`⌨️ Input system initialized (Mobile: ${this.isMobile})`);
  }

  shouldShowJoystick() {
    // Forcer l'affichage du joystick en mode debug ou selon les préférences
    return localStorage.getItem('pokeworld_force_joystick') === 'true' ||
           window.location.search.includes('joystick=true');
  }

  setupMobileJoystick() {
    // Configuration personnalisée pour PokeWorld
    const joystickConfig = {
      x: 120,
      y: this.scene.cameras.main.height - 120,
      baseRadius: this.isMobile ? 60 : 50,
      knobRadius: this.isMobile ? 25 : 20,
      maxDistance: this.isMobile ? 50 : 40,
      deadZone: 0.15,
      baseColor: 0x1a1a2e,
      baseAlpha: 0.8,
      knobColor: 0x64a6ff,
      knobAlpha: 0.9,
      autoHide: !this.isMobile, // Masquer auto sur desktop
      followPointer: false
    };

    this.mobileJoystick = new MobileJoystick(this.scene, joystickConfig);

    // Callback de mouvement du joystick
    this.mobileJoystick.onMove((input) => {
      this.handleJoystickInput(input);
    });

    this.mobileJoystick.onStart(() => {
      console.log('🕹️ Joystick activation');
    });

    this.mobileJoystick.onEnd(() => {
      this.currentMovement = {
        x: 0,
        y: 0,
        isMoving: false,
        direction: null,
        source: null
      };
      this.triggerMoveCallback();
    });
  }

  handleJoystickInput(input) {
    const speed = GAME_CONFIG.player.speed;
    
    // Convertir l'input du joystick en mouvement
    const moveX = input.x * speed;
    const moveY = input.y * speed;
    
    // Déterminer la direction principale
    let direction = null;
    if (input.force > 0.15) { // Zone morte
      if (Math.abs(input.x) > Math.abs(input.y)) {
        direction = input.x > 0 ? 'right' : 'left';
      } else {
        direction = input.y > 0 ? 'down' : 'up';
      }
    }

    this.currentMovement = {
      x: moveX,
      y: moveY,
      isMoving: input.force > 0.15,
      direction: direction,
      source: 'joystick'
    };

    this.triggerMoveCallback();
  }

  update(currentX, currentY) {
    // Priorité au joystick mobile si actif
    if (this.mobileJoystick && this.mobileJoystick.isMoving()) {
      // Le mouvement est déjà géré par handleJoystickInput
      return this.currentMovement;
    }

    // Sinon, traiter les inputs clavier
    return this.handleKeyboardInput(currentX, currentY);
  }

  handleKeyboardInput(currentX, currentY) {
    const speed = GAME_CONFIG.player.speed;
    let newX = currentX;
    let newY = currentY;
    let moved = false;
    let direction = null;

    // Vérifier les touches directionnelles
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      newX -= speed;
      moved = true;
      direction = 'left';
    }
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      newX += speed;
      moved = true;
      direction = 'right';
    }
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      newY -= speed;
      moved = true;
      direction = 'up';
    }
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      newY += speed;
      moved = true;
      direction = 'down';
    }

    // Appliquer les limites
    if (moved) {
      newX = Math.max(16, Math.min(784, newX));
      newY = Math.max(16, Math.min(592, newY));
    }

    this.currentMovement = {
      x: moved ? newX - currentX : 0,
      y: moved ? newY - currentY : 0,
      isMoving: moved,
      direction: direction,
      source: 'keyboard'
    };

    if (moved && this.callbacks.onMove) {
      this.callbacks.onMove(newX, newY);
    }

    return { moved, newX, newY };
  }

  triggerMoveCallback() {
    if (this.callbacks.onMove && this.currentMovement.isMoving) {
      // Pour le joystick, calculer la nouvelle position basée sur le delta
      this.callbacks.onMove(
        this.currentMovement.x,
        this.currentMovement.y,
        this.currentMovement.direction
      );
    }
  }

  // Méthodes publiques
  onMove(callback) {
    this.callbacks.onMove = callback;
  }

  getCurrentMovement() {
    return this.currentMovement;
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

  isMoving() {
    return this.currentMovement.isMoving;
  }

  getDirection() {
    return this.currentMovement.direction;
  }

  getInputSource() {
    return this.currentMovement.source;
  }

  // Méthodes de contrôle du joystick
  showJoystick() {
    if (this.mobileJoystick) {
      this.mobileJoystick.show();
    }
  }

  hideJoystick() {
    if (this.mobileJoystick) {
      this.mobileJoystick.hide();
    }
  }

  toggleJoystick() {
    if (!this.mobileJoystick) {
      this.setupMobileJoystick();
    } else {
      if (this.mobileJoystick.isActive) {
        this.hideJoystick();
      } else {
        this.showJoystick();
      }
    }
  }

  // Repositionner le joystick (utile pour les changements d'orientation)
  repositionJoystick(x, y) {
    if (this.mobileJoystick) {
      this.mobileJoystick.setPosition(x, y);
    }
  }

  // Gestion des événements de redimensionnement
  handleResize() {
    if (this.mobileJoystick && this.isMobile) {
      // Repositionner le joystick selon la nouvelle taille d'écran
      const camera = this.scene.cameras.main;
      this.repositionJoystick(120, camera.height - 120);
    }
  }

  // Nettoyage
  destroy() {
    if (this.mobileJoystick) {
      this.mobileJoystick.destroy();
      this.mobileJoystick = null;
    }
    
    this.callbacks = {};
    this.currentMovement = {
      x: 0,
      y: 0,
      isMoving: false,
      direction: null,
      source: null
    };
    
    console.log('⌨️ InputManager destroyed');
  }
}

// Fonction utilitaire pour détecter les appareils mobiles
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0);
}
