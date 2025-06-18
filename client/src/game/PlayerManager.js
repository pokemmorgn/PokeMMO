// src/game/PlayerManager.js - Spritesheet 3x4 (bas-gauche-droite-haut), 100% Phaser 3 compatible

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
    this.animsCreated = false;
    console.log("PlayerManager initialisé pour", scene.scene.key);
  }

  setMySessionId(sessionId) { this.mySessionId = sessionId; }

  getMyPlayer() {
    if (this.isDestroyed) return null;
    return this.players.get(this.mySessionId) || null;
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) return null;

    // Placeholder si spritesheet manquant
    if (!this.scene.textures.exists('BoyWalk')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff0000);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture('player_placeholder', 32, 32);
      graphics.destroy();
      const player = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1).setScale(1);
      player.setDepth(5);
      this.players.set(sessionId, player);
      return player;
    }

    // Crée les animations une seule fois
    if (!this.animsCreated) {
      this.createAnimations();
      this.animsCreated = true;
    }

    // Sprite physique joueur
    const player = this.scene.physics.add.sprite(x, y, 'BoyWalk', 1).setOrigin(0.5, 1).setScale(1);
    player.setDepth(5);
    player.sessionId = sessionId;
    // Petite hitbox, bien centrée sur les pieds :
    player.body.setSize(12, 8);
    player.body.setOffset(10, 24);
    // Debug hitbox optionnel
    player.body.debugShowBody = true; player.body.debugBodyColor = 0xff0000;

    // Animation idle par défaut (face bas, frame centrale)
    if (this.scene.anims.exists('idle_down')) player.play('idle_down');
    player.lastDirection = 'down';
    player.isMoving = false;

    // ⭐️ Initialisation des positions cibles (nécessaire pour le lerp)
    player.targetX = x;
    player.targetY = y;

    // Indicateur vert pour le joueur local
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
        .setDepth(1001)
        .setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
    }

    // 🏷️ AJOUT : Label du nom du joueur
    const displayName = playerName || sessionId.substring(0, 8);
    const nameConfig = this.scene.game.config.ui?.nameLabel || {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 4, y: 2 },
      offsetY: -45
    };

    // Couleur spéciale selon le type de joueur
    let nameColor = nameConfig.color;
    if (sessionId === this.mySessionId) {
      nameColor = nameConfig.colors?.self || '#00ff00'; // Vert pour soi-même
    } else {
      nameColor = nameConfig.colors?.others || '#ffffff'; // Blanc pour les autres
    }

    const nameLabel = this.scene.add.text(
      player.x, 
      player.y + nameConfig.offsetY, 
      displayName, 
      {
        fontSize: nameConfig.fontSize,
        fontFamily: nameConfig.fontFamily,
        color: nameColor,
        backgroundColor: nameConfig.backgroundColor,
        padding: nameConfig.padding
      }
    ).setOrigin(0.5, 1).setDepth(1002);

    player.nameLabel = nameLabel;

    this.players.set(sessionId, player);
    return player;
  }

  createAnimations() {
    const anims = this.scene.anims;

    if (!anims.exists('walk_down')) {
      anims.create({
        key: 'walk_down',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 3 }),
        frameRate: 15,
        repeat: -1,
      });
    }
    if (!anims.exists('walk_left')) {
      anims.create({
        key: 'walk_left',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 4, end: 7 }),
        frameRate: 15,
        repeat: -1,
      });
    }
    if (!anims.exists('walk_right')) {
      anims.create({
        key: 'walk_right',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 8, end: 11 }),
        frameRate: 15,
        repeat: -1,
      });
    }
    if (!anims.exists('walk_up')) {
      anims.create({
        key: 'walk_up',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 12, end: 14 }),
        frameRate: 15,
        repeat: -1,
      });
    }

    // Idles
    if (!anims.exists('idle_down')) {
      anims.create({
        key: 'idle_down',
        frames: [{ key: 'BoyWalk', frame: 1 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!anims.exists('idle_left')) {
      anims.create({
        key: 'idle_left',
        frames: [{ key: 'BoyWalk', frame: 5 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!anims.exists('idle_right')) {
      anims.create({
        key: 'idle_right',
        frames: [{ key: 'BoyWalk', frame: 9 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!anims.exists('idle_up')) {
      anims.create({
        key: 'idle_up',
        frames: [{ key: 'BoyWalk', frame: 13 }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  updatePlayers(state) {
    if (this.isDestroyed) return;
    if (!this.scene || !this.scene.scene.isActive()) return;
    if (this.scene.networkManager && this.scene.networkManager.isTransitioning) return;
    if (!state || !state.players) return;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    this.performUpdate(state);
  }

performUpdate(state) {
  if (this.isDestroyed || !this.scene?.scene?.isActive()) return;

  // Supprimer les joueurs déconnectés
  const currentSessionIds = new Set();
  state.players.forEach((playerState, sessionId) => {
    currentSessionIds.add(sessionId);
  });
  const playersToCheck = Array.from(this.players.keys());
  playersToCheck.forEach(sessionId => {
    if (!currentSessionIds.has(sessionId)) {
      this.removePlayer(sessionId);
    }
  });

  // Mettre à jour ou créer les joueurs
  state.players.forEach((playerState, sessionId) => {
    if (this.isDestroyed || !this.scene?.scene?.isActive()) return;

    let player = this.players.get(sessionId);

    if (!player) {
      player = this.createPlayer(sessionId, playerState.x, playerState.y);
    } else {
      if (!player.scene || player.scene !== this.scene) {
        this.players.delete(sessionId);
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
        return;
      }
    }

    // Stocker la position cible
    player.targetX = playerState.x;
    player.targetY = playerState.y;

    // Gérer les animations proprement
    if (playerState.isMoving !== undefined) {
      player.isMoving = playerState.isMoving;
    }
    if (playerState.direction) {
      player.lastDirection = playerState.direction;
    }

    if (player.isMoving && player.lastDirection) {
      const walkAnim = `walk_${player.lastDirection}`;
      if (this.scene.anims.exists(walkAnim)) {
        // Toujours jouer l'anim (repart du début) pour éviter le freeze
        player.anims.play(walkAnim, true);
      }
    } else if (!player.isMoving && player.lastDirection) {
      const idleAnim = `idle_${player.lastDirection}`;
      if (this.scene.anims.exists(idleAnim)) {
        // Toujours jouer l'anim idle pour remettre en pause
        player.anims.play(idleAnim, true);
      }
    }

    // Mettre à jour l’indicateur
    if (player.indicator && !this.isDestroyed) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 24;
    }
  });




state.players.forEach((playerState, sessionId) => {
  if (this.isDestroyed || !this.scene?.scene?.isActive()) return;

  let player = this.players.get(sessionId);

  if (!player) {
    player = this.createPlayer(sessionId, playerState.x, playerState.y);
  } else {
    if (!player.scene || player.scene !== this.scene) {
      this.players.delete(sessionId);
      player = this.createPlayer(sessionId, playerState.x, playerState.y);
      return;
    }
  }

  player.targetX = playerState.x;
  player.targetY = playerState.y;

  if (playerState.isMoving !== undefined) {
    player.isMoving = playerState.isMoving;

    if (playerState.direction) {
      player.lastDirection = playerState.direction;
    }

    // Joue toujours l'animation adaptée à l'état isMoving, même si direction est la même
    if (player.isMoving) {
      const walkAnim = `walk_${player.lastDirection}`;
      if (this.scene.anims.exists(walkAnim) && player.anims.currentAnim?.key !== walkAnim) {
        player.play(walkAnim);
      }
    } else {
      const idleAnim = `idle_${player.lastDirection}`;
      if (this.scene.anims.exists(idleAnim) && player.anims.currentAnim?.key !== idleAnim) {
        player.play(idleAnim);
      }
    }
  }

  if (player.indicator && !this.isDestroyed) {
    player.indicator.x = player.x;
    player.indicator.y = player.y - 24;
  }
});

  }

  // ⭐️ Nouvelle méthode update pour le lerp continu
  update() {
    const lerpFactor = 0.18; // Ajuste selon ton ressenti
    for (const [sessionId, player] of this.players) {
      if (sessionId !== this.mySessionId) {
        if (player.targetX !== undefined && player.targetY !== undefined) {
          player.x += (player.targetX - player.x) * lerpFactor;
          player.y += (player.targetY - player.y) * lerpFactor;
        }
      }
    }
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;
    const player = this.players.get(sessionId);
    if (player) {
      // Arrêter les animations
      if (player.anims && player.anims.isPlaying) {
        player.anims.stop();
      }

      if (player.indicator) {
        try { player.indicator.destroy(); } catch (e) {}
      }
      if (player.body && player.body.destroy) {
        try { player.body.destroy(); } catch (e) {}
      }
      try { player.destroy(); } catch (e) {}
      this.players.delete(sessionId);
    }
  }

  clearAllPlayers() {
    if (this.isDestroyed) return;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    const playersToRemove = Array.from(this.players.keys());
    playersToRemove.forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    this.mySessionId = null;
  }

  getAllPlayers() {
    return this.isDestroyed ? [] : Array.from(this.players.values());
  }

  getPlayerCount() {
    return this.isDestroyed ? 0 : this.players.size;
  }

  getPlayerInfo(sessionId) {
    if (this.isDestroyed) return null;
    const player = this.players.get(sessionId);
    if (player) {
      return {
        x: player.x,
        y: player.y,
        isMyPlayer: sessionId === this.mySessionId,
        direction: player.lastDirection,
        isMoving: player.isMoving
      };
    }
    return null;
  }

  destroy() {
    this.isDestroyed = true;
    this.clearAllPlayers();
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}
