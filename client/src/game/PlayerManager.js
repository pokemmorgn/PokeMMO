// src/game/PlayerManager.js - Version BoyWalk

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
    this.animsCreated = false;
    console.log("PlayerManager initialisé pour", scene.scene.key);
  }

  setMySessionId(sessionId) {
    this.mySessionId = sessionId;
    console.log("Mon sessionId défini :", sessionId);
  }

  getMyPlayer() {
    if (this.isDestroyed) return null;
    const player = this.players.get(this.mySessionId);
    return player || null;
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) {
      console.warn("PlayerManager détruit, création de joueur ignorée");
      return null;
    }

    // -- SPRITESHEET CHECK --
    if (!this.scene.textures.exists('BoyWalk')) {
      console.error("❌ Spritesheet 'BoyWalk' introuvable !");
      // Placeholder rouge
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff0000);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture('player_placeholder', 32, 32);
      graphics.destroy();
      const player = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1);
      player.setDepth(5);
      this.players.set(sessionId, player);
      return player;
    }

    // -- CRÉATION DES ANIMATIONS (1x au premier appel) --
    if (!this.animsCreated) {
      this.createAnimations();
      this.animsCreated = true;
    }

    // -- SPRITE CREATION --
    const player = this.scene.physics.add.sprite(x, y, 'BoyWalk', 0).setOrigin(0.5, 1);

    player.setDepth(5);
    player.setScale(1);
    player.body.setSize(player.width, player.height * 0.5);
    player.body.setOffset(0, player.height * 0.5);

    // Animation par défaut
    if (this.scene.anims.exists('idle_down')) {
      player.play('idle_down');
    }
    player.lastDirection = 'down';
    player.isMoving = false;
    player.sessionId = sessionId;

    // Indicateur pour ton joueur
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(0, -28, 3, 0x00ff00);
      indicator.setDepth(1001);
      indicator.setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
      console.log("👤 Mon joueur créé avec spritesheet BoyWalk");
    } else {
      console.log("👥 Autre joueur créé :", sessionId);
    }

    this.players.set(sessionId, player);
    return player;
  }

  // -- ANIMATIONS BOYWALK --
  createAnimations() {
    const anims = this.scene.anims;
    // Walk
    if (!anims.exists('walk_down')) {
      anims.create({
        key: 'walk_down',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!anims.exists('walk_left')) {
      anims.create({
        key: 'walk_left',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!anims.exists('walk_right')) {
      anims.create({
        key: 'walk_right',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!anims.exists('walk_up')) {
      anims.create({
        key: 'walk_up',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 12, end: 15 }),
        frameRate: 8,
        repeat: -1
      });
    }
    // Idle (1 frame pour chaque direction)
    if (!anims.exists('idle_down')) {
      anims.create({
        key: 'idle_down',
        frames: [{ key: 'BoyWalk', frame: 0 }],
        frameRate: 1,
        repeat: -1
      });
    }
    if (!anims.exists('idle_left')) {
      anims.create({
        key: 'idle_left',
        frames: [{ key: 'BoyWalk', frame: 4 }],
        frameRate: 1,
        repeat: -1
      });
    }
    if (!anims.exists('idle_right')) {
      anims.create({
        key: 'idle_right',
        frames: [{ key: 'BoyWalk', frame: 8 }],
        frameRate: 1,
        repeat: -1
      });
    }
    if (!anims.exists('idle_up')) {
      anims.create({
        key: 'idle_up',
        frames: [{ key: 'BoyWalk', frame: 12 }],
        frameRate: 1,
        repeat: -1
      });
    }
    console.log("🎞️ Animations BoyWalk créées !");
  }

  updatePlayers(state) {
    if (this.isDestroyed) {
      console.warn("PlayerManager détruit, updatePlayers ignoré");
      return;
    }
    if (!this.scene || !this.scene.scene.isActive()) {
      console.warn("Scène inactive, updatePlayers ignoré");
      return;
    }
    if (this.scene.networkManager && this.scene.networkManager.isTransitioning) {
      console.log("NetworkManager en transition, updatePlayers ignoré");
      return;
    }
    if (!state.players) {
      console.warn("❌ Pas de données players dans le state");
      return;
    }
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
      this.performUpdate(state);
    }, 16);
  }

  performUpdate(state) {
    if (this.isDestroyed || !this.scene?.scene?.isActive()) return;
    // Supprimer les joueurs déconnectés
    const currentSessionIds = new Set();
    state.players.forEach((playerState, sessionId) => {
      currentSessionIds.add(sessionId);
    });
    const playersToCheck = new Map(this.players);
    playersToCheck.forEach((player, sessionId) => {
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
        if (!this.scene.children.exists(player)) {
          this.players.delete(sessionId);
          player = this.createPlayer(sessionId, playerState.x, playerState.y);
          return;
        }
        if (sessionId === this.mySessionId) {
          const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            playerState.x, playerState.y
          );
          if (distance > 50) {
            player.x = playerState.x;
            player.y = playerState.y;
          }
        } else {
          const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            playerState.x, playerState.y
          );
          if (distance > 5) {
            if (this.scene.tweens && !player.isBeingTweened) {
              player.isBeingTweened = true;
              this.scene.tweens.add({
                targets: player,
                x: playerState.x,
                y: playerState.y,
                duration: 100,
                ease: 'Linear',
                onComplete: () => {
                  if (player && !this.isDestroyed) player.isBeingTweened = false;
                }
              });
            } else {
              player.x = playerState.x;
              player.y = playerState.y;
            }
            // Animation de marche (direction)
            const direction = this.calculateDirection(player.x, player.y, playerState.x, playerState.y);
            this.playWalkAnimation(player, direction);
            player.isMoving = true;
          } else {
            player.x = playerState.x;
            player.y = playerState.y;
            this.playIdleAnimation(player);
            player.isMoving = false;
          }
        }
        // Indicator update
        if (player.indicator && !this.isDestroyed) {
          player.indicator.x = player.x;
          player.indicator.y = player.y - 28;
        }
      }
    });
  }

  calculateDirection(fromX, fromY, toX, toY) {
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  playWalkAnimation(player, direction) {
    if (this.isDestroyed || !player || !player.scene || !direction) return;
    if (!player.scene.children.exists(player)) return;
    let animKey = '';
    if (['left', 'right', 'up', 'down'].includes(direction)) {
      animKey = `walk_${direction}`;
    } else {
      animKey = `idle_down`;
    }
    if (!player.scene.anims.exists(animKey)) {
      player.setFrame(0);
      return;
    }
    try {
      player.play(animKey, true);
      player.lastDirection = direction;
    } catch (error) {
      player.setFrame(0);
    }
  }

  playIdleAnimation(player) {
    if (this.isDestroyed || !player || !player.scene) return;
    if (!player.scene.children.exists(player)) return;
    try {
      player.stop();
      // Idle direction
      const last = player.lastDirection || 'down';
      const idleKey = `idle_${last}`;
      if (player.scene.anims.exists(idleKey)) {
        player.play(idleKey);
      } else {
        player.setFrame(0);
      }
    } catch (error) {
      player.setFrame(0);
    }
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;
    const player = this.players.get(sessionId);
    if (player) {
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

  playPlayerAnimation(sessionId, animationKey) {
    if (this.isDestroyed) return;
    const player = this.players.get(sessionId);
    if (player && this.scene.anims.exists(animationKey)) {
      try {
        player.play(animationKey, true);
      } catch (error) {}
    }
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
        direction: player.lastDirection,
        isMoving: player.isMoving,
        isMyPlayer: sessionId === this.mySessionId
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