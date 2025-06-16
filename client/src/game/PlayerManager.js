// src/game/PlayerManager.js - BoyWalk, 32x32, Animations ordonnées (0-4, 5-8, ...)

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
      // Placeholder rouge 32x32
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

    // -- CRÉATION DES ANIMATIONS (1x au premier appel) --
    if (!this.animsCreated) {
      this.createAnimations();
      this.animsCreated = true;
    }

    // -- SPRITE CREATION --
    const player = this.scene.physics.add.sprite(x, y, 'BoyWalk', 0).setOrigin(0.5, 1).setScale(1);
    player.setDepth(5);
    player.sessionId = sessionId;

    // Hitbox classique pour 32x32
    player.body.setSize(16, 10);
    player.body.setOffset(8, 22);

    // Animation par défaut
    if (this.scene.anims.exists('idle_down')) {
      player.play('idle_down');
    }
    player.lastDirection = 'down';
    player.isMoving = false;

    // Indicateur pour ton joueur
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(0, -24, 3, 0x00ff00);
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

  // -- ANIMATIONS BOYWALK : index dans l'ordre demandé --
  createAnimations() {
    const anims = this.scene.anims;
    // BAS : 0 1 2 3 4
    if (!anims.exists('walk_down')) {
      anims.create({
        key: 'walk_down',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 4 }),
        frameRate: 8,
        repeat: -1
      });
    }
    // GAUCHE : 5 6 7 8
    if (!anims.exists('walk_left')) {
      anims.create({
        key: 'walk_left',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 5, end: 8 }),
        frameRate: 8,
        repeat: -1
      });
    }
    // DROITE : 9 10 11 12
    if (!anims.exists('walk_right')) {
      anims.create({
        key: 'walk_right',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 9, end: 12 }),
        frameRate: 8,
        repeat: -1
      });
    }
    // HAUT : 13 14 15 16
    if (!anims.exists('walk_up')) {
      anims.create({
        key: 'walk_up',
        frames: anims.generateFrameNumbers('BoyWalk', { start: 13, end: 16 }),
        frameRate: 8,
        repeat: -1
      });
    }
    // IDLE = première frame de chaque direction
    if (!anims.exists('idle_down')) {
      anims.create({
        key: 'idle_down',
        frames: [{ key: 'BoyWalk', frame: 0 }],
        frameRate: 1,
        repeat: 0
      });
    }
    if (!anims.exists('idle_left')) {
      anims.create({
        key: 'idle_left',
        frames: [{ key: 'BoyWalk', frame: 5 }],
        frameRate: 1,
        repeat: 0
      });
    }
    if (!anims.exists('idle_right')) {
      anims.create({
        key: 'idle_right',
        frames: [{ key: 'BoyWalk', frame: 9 }],
        frameRate: 1,
        repeat: 0
      });
    }
    if (!anims.exists('idle_up')) {
      anims.create({
        key: 'idle_up',
        frames: [{ key: 'BoyWalk', frame: 13 }],
        frameRate: 1,
        repeat: 0
      });
    }
    console.log("🎞️ Animations BoyWalk créées (0-4 bas, 5-8 gauche, 9-12 droite, 13-16 haut)");
  }

  updatePlayers(state) {
    if (this.isDestroyed) return;
    if (!this.scene || !this.scene.scene.isActive()) return;
    if (this.scene.networkManager && this.scene.networkManager.isTransitioning) return;
    if (!state.players) return;
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
        player.x = playerState.x;
        player.y = playerState.y;
        // Indicateur
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