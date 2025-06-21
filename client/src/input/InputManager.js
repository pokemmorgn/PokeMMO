// client/src/input/InputManager.js - Version internationale WASD/ZQSD auto
import { GAME_CONFIG } from "../config/gameConfig.js";
import { MobileJoystick } from "./MobileJoystick.js";

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.cursors = null;
    this.wasdKeys = null;
    this.mobileJoystick = null;
    this.isMobile = this.detectMobile();
    
    // Flag pour forcer l'arrêt du mouvement
    this.forceStop = false;
    
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
    
    this.setupInput();

    // Désactive le menu contextuel (clic droit) pour éviter les bugs de touche coincée
    this.scene.input.mouse.disableContextMenu();

    // Réinitialise les touches si le joueur perd le focus (ex : alt-tab)
    window.addEventListener('blur', () => {
      this.resetMovement();
    });

    // RESET complet à chaque clic droit n'importe où
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // bouton droit
        this.resetMovement();
      }
    });

    // Reset aussi sur contextmenu (au cas où)
    window.addEventListener('contextmenu', (e) => {
      this.resetMovement();
    });
  }

  // Méthode centralisée pour reset complet du mouvement
  resetMovement() {
    console.log('🛑 Reset mouvement forcé');
    
    // Flag pour forcer l'arrêt
    this.forceStop = true;
    
    // Reset des touches Phaser
    this.scene.input.keyboard.resetKeys();
    
    // NOUVEAU: Forcer l'arrêt de toutes les touches individuellement
    if (this.cursors) {
      this.cursors.left.reset();
      this.cursors.right.reset();
      this.cursors.up.reset();
      this.cursors.down.reset();
    }
    
    if (this.wasdKeys) {
      Object.values(this.wasdKeys).forEach(key => {
        if (key && key.reset) key.reset();
      });
    }
    
    // Reset du mouvement actuel
    this.currentMovement = {
      x: 0,
      y: 0,
      isMoving: false,
      direction: null,
      source: null
    };

    // Reset du joystick si présent
    if (this.mobileJoystick) {
      this.mobileJoystick.reset();
    }

    // NOUVEAU: Notifier la scène du reset
    if (this.scene && this.scene.player) {
      // Arrêter l'animation du joueur
      if (this.scene.player.anims) {
        this.scene.player.anims.stop();
      }
      
      // Arrêter la vélocité si c'est un physics body
      if (this.scene.player.body) {
        this.scene.player.body.setVelocity(0, 0);
      }
      
      // Callback personnalisé pour la scène
      if (this.scene.onPlayerMovementReset) {
        this.scene.onPlayerMovementReset();
      }
    }

    // Callback pour notifier l'arrêt
    this.triggerMoveCallback();

    // Remet le flag à false après un court délai
    setTimeout(() => {
      this.forceStop = false;
    }, 150);
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  // Nouvelle méthode pour choisir le mapping en fonction de la langue
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
      // AZERTY : ZQSD
      this.wasdKeys = this.scene.input.keyboard.addKeys('Z,Q,S,D');
    } else {
      // QWERTY (défaut) : WASD
      this.wasdKeys = this.scene.input.keyboard.addKeys('W,A,S,D');
    }

    this.scene.input.keyboard.enabled = true;
    this.scene.input.keyboard.enableGlobalCapture();

    if (this.isMobile || this.shouldShowJoystick()) {
      this.setupMobileJoystick();
    }
    
    console.log(`⌨️ Input system initialized (Mobile: ${this.isMobile}, Layout: ${layout})`);
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
    // Si on force l'arrêt, ignore le joystick
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
      x: moveX,
      y: moveY,
      isMoving: input.force > 0.15,
      direction: direction,
      source: 'joystick'
    };

    this.triggerMoveCallback();
  }

  update(currentX, currentY) {
    // Si on force l'arrêt, retourne un mouvement vide
    if (this.forceStop) {
      return {
        moved: false,
        newX: currentX,
        newY: currentY
      };
    }

    if (this.mobileJoystick && this.mobileJoystick.isMoving()) {
      return this.currentMovement;
    }
    return this.handleKeyboardInput(currentX, currentY);
  }

  handleKeyboardInput(currentX, currentY) {
    // Si on force l'arrêt, ne traite pas les touches
    if (this.forceStop) {
      return {
        moved: false,
        newX: currentX,
        newY: currentY
      };
    }

    const speed = GAME_CONFIG.player.speed;
    let newX = currentX;
    let newY = currentY;
    let moved = false;
    let direction = null;

    // Vérification supplémentaire : si toutes les touches sont relâchées, force l'arrêt
    const anyKeyPressed = this.cursors.left.isDown || this.cursors.right.isDown || 
                         this.cursors.up.isDown || this.cursors.down.isDown ||
                         this.wasdKeys.A?.isDown || this.wasdKeys.Q?.isDown ||
                         this.wasdKeys.D?.isDown || this.wasdKeys.W?.isDown ||
                         this.wasdKeys.Z?.isDown || this.wasdKeys.S?.isDown;

    if (!anyKeyPressed) {
      this.currentMovement = {
        x: 0,
        y: 0,
        isMoving: false,
        direction: null,
        source: 'keyboard'
      };
      return {
        moved: false,
        newX: currentX,
        newY: currentY
      };
    }

    // On regarde le mapping dynamique (AZERTY: ZQSD, QWERTY: WASD)
    if (this.cursors.left.isDown || this.wasdKeys.A?.isDown || this.wasdKeys.Q?.isDown) {
      newX -= speed;
      moved = true;
      direction = 'left';
    }
    if (this.cursors.right.isDown || this.wasdKeys.D?.isDown) {
      newX += speed;
      moved = true;
      direction = 'right';
    }
    if (this.cursors.up.isDown || this.wasdKeys.W?.isDown || this.wasdKeys.Z?.isDown) {
      newY -= speed;
      moved = true;
      direction = 'up';
    }
    if (this.cursors.down.isDown || this.wasdKeys.S?.isDown) {
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
    // Si on force l'arrêt, aucune touche n'est considérée comme pressée
    if (this.forceStop) return false;

    switch(key.toLowerCase()) {
      case 'left': return this.cursors.left.isDown || this.wasdKeys.A?.isDown || this.wasdKeys.Q?.isDown;
      case 'right': return this.cursors.right.isDown || this.wasdKeys.D?.isDown;
      case 'up': return this.cursors.up.isDown || this.wasdKeys.W?.isDown || this.wasdKeys.Z?.isDown;
      case 'down': return this.cursors.down.isDown || this.wasdKeys.S?.isDown;
      default: return false;
    }
  }

  isMoving() {
    return !this.forceStop && this.currentMovement.isMoving;
  }

  getDirection() {
    return this.forceStop ? null : this.currentMovement.direction;
  }

  getInputSource() {
    return this.forceStop ? null : this.currentMovement.source;
  }

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

  repositionJoystick(x, y) {
    if (this.mobileJoystick) {
      this.mobileJoystick.setPosition(x, y);
    }
  }

  handleResize() {
    if (this.mobileJoystick && this.isMobile) {
      const camera = this.scene.cameras.main;
      this.repositionJoystick(120, camera.height - 120);
    }
  }

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

export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0);
}
