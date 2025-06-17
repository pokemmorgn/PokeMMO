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
    player.body.setSize(16, 10);
    player.body.setOffset(8, 22);

    // Animation idle par défaut (face bas, frame centrale)
    if (this.scene.anims.exists('idle_down')) player.play('idle_down');
    player.lastDirection = 'down';
    player.isMoving = false;

    // Indicateur vert pour le joueur local
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
        .setDepth(1001)
        .setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
    }

    this.players.set(sessionId, player);
    return player;
  }

  createAnimations() {
    const anims = this.scene.anims;
    // BAS : frames 0,1,2
    if (!anims.exists('walk_down')) {
      anims.create({
        key: 'walk_down',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    // GAUCHE : 3,4,5
    if (!anims.exists('walk_left')) {
      anims.create({
        key: 'walk_left',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 3, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    // DROITE : 6,7,8
    if (!anims.exists('walk_right')) {
      anims.create({
        key: 'walk_right',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 6, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    // HAUT : 9,10,11
    if (!anims.exists('walk_up')) {
      anims.create({
        key: 'walk_up',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 9, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    // IDLE (toujours frame du milieu)
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
        frames: [{ key: 'BoyWalk', frame: 4 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!anims.exists('idle_right')) {
      anims.create({
        key: 'idle_right',
        frames: [{ key: 'BoyWalk', frame: 7 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    if (!anims.exists('idle_up')) {
      anims.create({
        key: 'idle_up',
        frames: [{ key: 'BoyWalk', frame: 10 }],
        frameRate: 1,
        repeat: 0,
      });
    }
    console.log("🎞️ Animations BoyWalk créées (3x4, bas-gauche-droite-haut)");
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
    // Créer une copie pour éviter les modifications pendant l'itération
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
        // Créer un nouveau joueur
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
      } else {
        // Vérifier que le sprite existe toujours dans la scène
        if (!player.scene || player.scene !== this.scene) {
          this.players.delete(sessionId);
          player = this.createPlayer(sessionId, playerState.x, playerState.y);
          return;
        }

        // Mettre à jour la position
        player.x = playerState.x;
        player.y = playerState.y;

        // Gérer les animations en fonction du mouvement
        if (playerState.isMoving !== undefined) {
          player.isMoving = playerState.isMoving;

          if (playerState.direction && playerState.direction !== player.lastDirection) {
            player.lastDirection = playerState.direction;

            // Jouer l'animation appropriée
            if (player.isMoving) {
              const walkAnim = `walk_${playerState.direction}`;
              if (this.scene.anims.exists(walkAnim) && player.anims.currentAnim?.key !== walkAnim) {
                player.play(walkAnim);
              }
            } else {
              const idleAnim = `idle_${playerState.direction}`;
              if (this.scene.anims.exists(idleAnim) && player.anims.currentAnim?.key !== idleAnim) {
                player.play(idleAnim);
              }
            }
          }
        }

        // Indicateur "cercle vert" pour ton joueur : il suit le joueur
        if (player.indicator && !this.isDestroyed) {
          player.indicator.x = player.x;
          player.indicator.y = player.y - 24;
        }
      }
    });
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
