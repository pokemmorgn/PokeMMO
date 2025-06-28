// client/src/input/InputManager.js - Version complète avec MovementBlockHandler et mapping dynamique QWERTY/AZERTY

import { GAME_CONFIG } from "../config/gameConfig.js";
import { MobileJoystick } from "./MobileJoystick.js";

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.cursors = null;
    this.wasdKeys = null;
    this.mobileJoystick = null;
    this.isMobile = this.detectMobile();

    this.forceStop = false;

    // MovementBlockHandler
    this._movementBlockHandler = null;
    this.movementBlockHandlerReady = false;
    this.movementBlockHandlerConnectionAttempts = 0;
    this.maxConnectionAttempts = 5;

    this.callbacks = {
      onMove: null
    };

    this.currentMovement = {
      x: 0,
      y: 0,
      isMoving: false,
      direction: null,
      source: null
    };

    // Mapping dynamique (patch bug QWERTY/AZERTY)
    this.keyMapping = { left: null, right: null, up: null, down: null };

    this.setupInput();

    // Désactive le menu contextuel (clic droit)
    this.scene.input.mouse.disableContextMenu();

    // Reset si perte focus (alt-tab)
    window.addEventListener('blur', () => { this.resetMovement(); });

    // Reset sur clic droit partout
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.resetMovement();
    });
    window.addEventListener('contextmenu', () => { this.resetMovement(); });
  }

  get movementBlockHandler() {
    if (!this._movementBlockHandler && typeof movementBlockHandler !== 'undefined') {
      console.log(`🔗 [InputManager] Connexion lazy au MovementBlockHandler global`);
      this._movementBlockHandler = movementBlockHandler;
      this.movementBlockHandlerReady = true;
    } else if (!this._movementBlockHandler && this.movementBlockHandlerConnectionAttempts < this.maxConnectionAttempts) {
      this.movementBlockHandlerConnectionAttempts++;
      console.log(`🔄 [InputManager] Tentative connexion MovementBlockHandler ${this.movementBlockHandlerConnectionAttempts}/${this.maxConnectionAttempts}`);
      this.tryConnectMovementBlockHandler();
    }
    return this._movementBlockHandler;
  }

  async tryConnectMovementBlockHandler() {
    try {
      const { movementBlockHandler } = await import('./MovementBlockHandler.js');
      if (movementBlockHandler) {
        console.log(`✅ [InputManager] MovementBlockHandler connecté via import dynamique`);
        this._movementBlockHandler = movementBlockHandler;
        this.movementBlockHandlerReady = true;
      }
    } catch (error) {
      console.warn(`⚠️ [InputManager] Impossible de connecter MovementBlockHandler:`, error);
    }
  }

  resetMovement() {
    console.log('🛑 Reset mouvement forcé');
    this.forceStop = true;
    this.scene.input.keyboard.resetKeys();
    if (this.cursors) {
      this.cursors.left.reset();
      this.cursors.right.reset();
      this.cursors.up.reset();
      this.cursors.down.reset();
    }
    if (this.wasdKeys) {
      Object.values(this.wasdKeys).forEach(key => { if (key && key.reset) key.reset(); });
    }
    this.currentMovement = {
      x: 0, y: 0, isMoving: false, direction: null, source: null
    };
    if (this.mobileJoystick) this.mobileJoystick.reset();

    if (this.scene && this.scene.player) {
      if (this.scene.player.anims) this.scene.player.anims.stop();
      if (this.scene.player.body) this.scene.player.body.setVelocity(0, 0);
      if (this.scene.onPlayerMovementReset) this.scene.onPlayerMovementReset();
    }
    this.triggerMoveCallback();
    setTimeout(() => { this.forceStop = false; }, 150);
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  getPreferredLayout() {
    const lang = navigator.language || navigator.userLanguage;
    if (!lang) return "qwerty";
    return lang.toLowerCase().startsWith("fr") ? "azerty" : "qwerty";
  }

  setupInput() {
    this.cursors = this.scene.input.keyboard.createCursorKeys();

    // Sélection dynamique du mapping
    const layout = this.getPreferredLayout();
    if (layout === "azerty") {
      this.wasdKeys = this.scene.input.keyboard.addKeys('Z,Q,S,D');
      this.keyMapping = { left: 'Q', right: 'D', up: 'Z', down: 'S' };
    } else {
      this.wasdKeys = this.scene.input.keyboard.addKeys('W,A,S,D');
      this.keyMapping = { left: 'A', right: 'D', up: 'W', down: 'S' };
    }
    this.scene.input.keyboard.enabled = true;
    this.scene.input.keyboard.enableGlobalCapture();

    if (this.isMobile || this.shouldShowJoystick()) this.setupMobileJoystick();

    console.log(`⌨️ Input system initialized (Mobile: ${this.isMobile}, Layout: ${layout}, Mapping:`, this.keyMapping, ')');
  }

  shouldShowJoystick() {
    return localStorage.getItem('pokeworld_force_joystick') === 'true' ||
           window.location.search.includes('joystick=true');
  }

  setupMobileJoystick() {
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
      autoHide: !this.isMobile,
      followPointer: false
    };
    this.mobileJoystick = new MobileJoystick(this.scene, joystickConfig);

    this.mobileJoystick.onMove((input) => { this.handleJoystickInput(input); });
    this.mobileJoystick.onStart(() => { console.log('🕹️ Joystick activation'); });
    this.mobileJoystick.onEnd(() => {
      this.currentMovement = {
        x: 0, y: 0, isMoving: false, direction: null, source: null
      };
      this.triggerMoveCallback();
    });
  }

  handleJoystickInput(input) {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) {
      this.movementBlockHandler.validateMovement();
      return;
    }
    if (this.forceStop) return;

    const speed = GAME_CONFIG.player.speed;
    const moveX = input.x * speed;
    const moveY = input.y * speed;
    let direction = null;
    if (input.force > 0.15) {
      if (Math.abs(input.x) > Math.abs(input.y)) {
        direction = input.x > 0 ? 'right' : 'left';
      } else {
        direction = input.y > 0 ? 'down' : 'up';
      }
    }
    this.currentMovement = {
      x: moveX, y: moveY, isMoving: input.force > 0.15, direction, source: 'joystick'
    };
    this.triggerMoveCallback();
  }

  update(currentX, currentY) {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) {
      this.movementBlockHandler.validateMovement();
      return { moved: false, newX: currentX, newY: currentY };
    }
    if (this.forceStop) {
      return { moved: false, newX: currentX, newY: currentY };
    }
    if (this.mobileJoystick && this.mobileJoystick.isMoving()) {
      return this.currentMovement;
    }
    return this.handleKeyboardInput(currentX, currentY);
  }

  handleKeyboardInput(currentX, currentY) {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) {
      this.movementBlockHandler.validateMovement();
      return { moved: false, newX: currentX, newY: currentY };
    }
    if (this.forceStop) {
      return { moved: false, newX: currentX, newY: currentY };
    }
    const speed = GAME_CONFIG.player.speed;
    let newX = currentX;
    let newY = currentY;
    let moved = false;
    let direction = null;

    // Détection dynamique du layout (patch bug QWERTY/AZERTY)
    const anyKeyPressed =
      this.cursors.left.isDown || this.cursors.right.isDown ||
      this.cursors.up.isDown || this.cursors.down.isDown ||
      this.wasdKeys[this.keyMapping.left]?.isDown ||
      this.wasdKeys[this.keyMapping.right]?.isDown ||
      this.wasdKeys[this.keyMapping.up]?.isDown ||
      this.wasdKeys[this.keyMapping.down]?.isDown;

    if (!anyKeyPressed) {
      this.currentMovement = {
        x: 0, y: 0, isMoving: false, direction: null, source: 'keyboard'
      };
      return { moved: false, newX: currentX, newY: currentY };
    }

    if (this.cursors.left.isDown || this.wasdKeys[this.keyMapping.left]?.isDown) {
      newX -= speed;
      moved = true;
      direction = 'left';
    }
    if (this.cursors.right.isDown || this.wasdKeys[this.keyMapping.right]?.isDown) {
      newX += speed;
      moved = true;
      direction = 'right';
    }
    if (this.cursors.up.isDown || this.wasdKeys[this.keyMapping.up]?.isDown) {
      newY -= speed;
      moved = true;
      direction = 'up';
    }
    if (this.cursors.down.isDown || this.wasdKeys[this.keyMapping.down]?.isDown) {
      newY += speed;
      moved = true;
      direction = 'down';
    }

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
      this.callbacks.onMove(
        this.currentMovement.x,
        this.currentMovement.y,
        this.currentMovement.direction
      );
    }
  }

  onMove(callback) {
    this.callbacks.onMove = callback;
  }

  getCurrentMovement() {
    return this.currentMovement;
  }

  isKeyDown(key) {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) return false;
    if (this.forceStop) return false;
    switch(key.toLowerCase()) {
      case 'left': return this.cursors.left.isDown || this.wasdKeys[this.keyMapping.left]?.isDown;
      case 'right': return this.cursors.right.isDown || this.wasdKeys[this.keyMapping.right]?.isDown;
      case 'up': return this.cursors.up.isDown || this.wasdKeys[this.keyMapping.up]?.isDown;
      case 'down': return this.cursors.down.isDown || this.wasdKeys[this.keyMapping.down]?.isDown;
      default: return false;
    }
  }

  isMoving() {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) return false;
    return !this.forceStop && this.currentMovement.isMoving;
  }

  getDirection() {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) return null;
    return this.forceStop ? null : this.currentMovement.direction;
  }

  getInputSource() {
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) return null;
    return this.forceStop ? null : this.currentMovement.source;
  }

  showJoystick() { if (this.mobileJoystick) this.mobileJoystick.show(); }
  hideJoystick() { if (this.mobileJoystick) this.mobileJoystick.hide(); }
  toggleJoystick() {
    if (!this.mobileJoystick) { this.setupMobileJoystick(); }
    else { if (this.mobileJoystick.isActive) this.hideJoystick(); else this.showJoystick(); }
  }
  repositionJoystick(x, y) { if (this.mobileJoystick) this.mobileJoystick.setPosition(x, y); }
  handleResize() {
    if (this.mobileJoystick && this.isMobile) {
      const camera = this.scene.cameras.main;
      this.repositionJoystick(120, camera.height - 120);
    }
  }
  forceStopMovement(reason = 'system') {
    console.log(`🛑 Force arrêt mouvement: ${reason}`);
    this.resetMovement();
    if (this.movementBlockHandler && this.movementBlockHandler.isMovementBlocked()) {
      this.movementBlockHandler.validateMovement();
    }
  }
  areInputsEnabled() {
    const blockHandlerBlocked = this.movementBlockHandler ? this.movementBlockHandler.isMovementBlocked() : false;
    return !blockHandlerBlocked && !this.forceStop;
  }
  getStatus() {
    return {
      forceStop: this.forceStop,
      movementBlocked: this.movementBlockHandler ? this.movementBlockHandler.isMovementBlocked() : false,
      inputsEnabled: this.areInputsEnabled(),
      currentMovement: this.currentMovement,
      isMobile: this.isMobile,
      hasJoystick: !!this.mobileJoystick,
      joystickActive: this.mobileJoystick?.isActive || false,
      movementBlockHandlerReady: this.movementBlockHandlerReady,
      movementBlockHandlerConnectionAttempts: this.movementBlockHandlerConnectionAttempts,
      hasMovementBlockHandlerReference: !!this._movementBlockHandler
    };
  }
  forceConnectMovementBlockHandler() {
    console.log(`🔧 [InputManager] Force connexion MovementBlockHandler...`);
    this.movementBlockHandlerConnectionAttempts = 0;
    this._movementBlockHandler = null;
    this.movementBlockHandlerReady = false;
    const handler = this.movementBlockHandler;
    if (handler) {
      console.log(`✅ [InputManager] MovementBlockHandler connecté avec succès`);
      return true;
    } else {
      console.warn(`⚠️ [InputManager] Impossible de connecter MovementBlockHandler`);
      return false;
    }
  }
  testMovementBlockHandlerConnection() {
    console.log(`🧪 [InputManager] Test connexion MovementBlockHandler...`);
    const status = {
      hasReference: !!this._movementBlockHandler,
      isReady: this.movementBlockHandlerReady,
      attempts: this.movementBlockHandlerConnectionAttempts,
      canCall: false,
      isBlocked: false
    };
    if (this.movementBlockHandler) {
      try {
        status.canCall = true;
        status.isBlocked = this.movementBlockHandler.isMovementBlocked();
        console.log(`✅ [InputManager] MovementBlockHandler fonctionnel`);
      } catch (error) {
        console.error(`❌ [InputManager] Erreur test MovementBlockHandler:`, error);
        status.canCall = false;
      }
    }
    console.log(`📊 [InputManager] Status test:`, status);
    return status;
  }
  destroy() {
    if (this.mobileJoystick) {
      this.mobileJoystick.destroy();
      this.mobileJoystick = null;
    }
    this._movementBlockHandler = null;
    this.movementBlockHandlerReady = false;
    this.movementBlockHandlerConnectionAttempts = 0;
    this.callbacks = {};
    this.currentMovement = {
      x: 0, y: 0, isMoving: false, direction: null, source: null
    };
    console.log('⌨️ InputManager destroyed');
  }
  debug() {
    console.log('🔍 === DEBUG INPUT MANAGER ===');
    console.log('📊 Status général:', this.getStatus());
    console.log('🎮 Touches actuelles:', {
      left: this.isKeyDown('left'),
      right: this.isKeyDown('right'),
      up: this.isKeyDown('up'),
      down: this.isKeyDown('down')
    });
    console.log('🕹️ Joystick:', {
      exists: !!this.mobileJoystick,
      active: this.mobileJoystick?.isActive,
      moving: this.mobileJoystick?.isMoving()
    });
    console.log('🔒 MovementBlockHandler:', {
      connected: !!this._movementBlockHandler,
      ready: this.movementBlockHandlerReady,
      attempts: this.movementBlockHandlerConnectionAttempts,
      blocked: this.movementBlockHandler ? this.movementBlockHandler.isMovementBlocked() : 'N/A'
    });
    console.log('================================');
  }
}

export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0);
}
