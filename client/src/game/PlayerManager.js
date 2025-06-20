// src/game/PlayerManager.js - Version WorldRoom, transition friendly

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
    this.animsCreated = false;
    this._myPlayerIsReady = false;
    this._myPlayerReadyCallback = null;
    this._lastGetMyPlayerWarn = false; // Pour éviter spam

    console.log("%c[PlayerManager] Initialisé pour", "color:orange", scene.scene.key);

    // Listener SNAP (optionnel, Colyseus)
    if (scene.networkManager && scene.networkManager.room) {
      scene.networkManager.room.onMessage("snap", (data) => {
        this.snapMyPlayerTo(data.x, data.y);
      });
    }
  }

  setMySessionId(sessionId) {
    if (!sessionId) return;
    if (this.mySessionId && this.mySessionId !== sessionId) {
      // Migration joueur local si nécessaire
      const myPlayer = this.players.get(this.mySessionId);
      if (myPlayer) {
        this.players.delete(this.mySessionId);
        this.players.set(sessionId, myPlayer);
        myPlayer.sessionId = sessionId;
        myPlayer.setVisible(true);
        myPlayer.setActive(true);
        if (myPlayer.indicator) myPlayer.indicator.setVisible(true);
      }
    }
    this.mySessionId = sessionId;
    this._myPlayerIsReady = false;
  }

  getMyPlayer() {
    if (this.isDestroyed) return null;
    const player = this.players.get(this.mySessionId) || null;
    if (!player && !this._lastGetMyPlayerWarn) {
      this._lastGetMyPlayerWarn = true;
      // Warn une seule fois tant que non trouvé
      console.warn("[PlayerManager] getMyPlayer: Aucun joueur trouvé pour mySessionId", this.mySessionId, "| Sessions:", Array.from(this.players.keys()));
      this.debugPlayerState();
      // Relance recherche 1x (des fois updatePlayers n'est pas encore passé)
      setTimeout(() => { this._lastGetMyPlayerWarn = false; }, 1000);
    }
    return player;
  }

  debugPlayerState() {
    console.log("%c[PlayerManager] 🔍 DEBUG État des joueurs:", "color:red; font-weight:bold");
    console.log("- mySessionId:", this.mySessionId);
    console.log("- players.size:", this.players.size);
    console.log("- sessionIds disponibles:", Array.from(this.players.keys()));
    if (this.scene.networkManager) {
      console.log("- networkManager.sessionId:", this.scene.networkManager.getSessionId());
      console.log("- networkManager.isConnected:", this.scene.networkManager.isConnected);
    }
    this.players.forEach((player, sessionId) => {
      console.log(`- Joueur ${sessionId}:`, {
        x: player.x, y: player.y, visible: player.visible, active: player.active,
        hasIndicator: !!player.indicator
      });
    });
  }

  snapMyPlayerTo(x, y) {
    const player = this.getMyPlayer();
    if (!player) return;
    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0.20;
    if (Math.abs(player.x - x) > 64 || Math.abs(player.y - y) > 64) {
      player.x = x;
      player.y = y;
      player.snapLerpTimer = 0;
    }
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) return null;
    if (this.players.has(sessionId)) {
      // Si déjà présent (cas rare), MAJ position
      const existing = this.players.get(sessionId);
      existing.x = x;
      existing.y = y;
      existing.setVisible(true);
      existing.setActive(true);
      return existing;
    }
    if (!this.scene.textures.exists('BoyWalk')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff0000);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture('player_placeholder', 32, 32);
      graphics.destroy();
      const player = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1).setScale(1);
      player.setDepth(5);
      player.sessionId = sessionId;
      this.players.set(sessionId, player);
      return player;
    }
    if (!this.animsCreated) {
      this.createAnimations();
      this.animsCreated = true;
    }
    const player = this.scene.physics.add.sprite(x, y, 'BoyWalk', 1).setOrigin(0.5, 1).setScale(1);
    player.setDepth(5);
    player.sessionId = sessionId;
    player.body.setSize(12, 8);
    player.body.setOffset(10, 24);
    player.body.debugShowBody = true;
    player.body.debugBodyColor = 0xff0000;
    if (this.scene.anims.exists('idle_down')) player.play('idle_down');
    player.lastDirection = 'down';
    player.isMoving = false;
    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0;
    player.setVisible(true);
    player.setActive(true);

    // Indicateur local (vert)
    if (sessionId === this.mySessionId) {
      if (player.indicator) { player.indicator.destroy(); }
      this.scene.children.list
        .filter(obj => obj && obj.type === "Arc" && obj.fillColor === 0x00ff00)
        .forEach(obj => { try { obj.destroy(); } catch (e) {} });
      const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
        .setDepth(1001)
        .setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
      indicator.setVisible(true);
    }
    this.players.set(sessionId, player);
    return player;
  }

  createAnimations() {
    const anims = this.scene.anims;
    if (!anims.exists('walk_down')) anims.create({ key: 'walk_down', frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
    if (!anims.exists('walk_left')) anims.create({ key: 'walk_left', frames: anims.generateFrameNumbers('BoyWalk', { start: 4, end: 7 }), frameRate: 15, repeat: -1 });
    if (!anims.exists('walk_right')) anims.create({ key: 'walk_right', frames: anims.generateFrameNumbers('BoyWalk', { start: 8, end: 11 }), frameRate: 15, repeat: -1 });
    if (!anims.exists('walk_up')) anims.create({ key: 'walk_up', frames: anims.generateFrameNumbers('BoyWalk', { start: 12, end: 14 }), frameRate: 15, repeat: -1 });
    if (!anims.exists('idle_down')) anims.create({ key: 'idle_down', frames: [{ key: 'BoyWalk', frame: 1 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_left')) anims.create({ key: 'idle_left', frames: [{ key: 'BoyWalk', frame: 5 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_right')) anims.create({ key: 'idle_right', frames: [{ key: 'BoyWalk', frame: 9 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_up')) anims.create({ key: 'idle_up', frames: [{ key: 'BoyWalk', frame: 13 }], frameRate: 1, repeat: 0 });
  }

  updatePlayers(state) {
    if (this.isDestroyed) return;
    if (!this.scene || !this.scene.scene.isActive()) return;
    if (!state || !state.players) return;

    // Sync sessionId si besoin
    if (this.scene.networkManager) {
      const currentNetworkSessionId = this.scene.networkManager.getSessionId();
      if (this.mySessionId !== currentNetworkSessionId) {
        this.setMySessionId(currentNetworkSessionId);
      }
    }

    // Mettre à jour tous les joueurs du state global
    const stateSessionIds = new Set();
    state.players.forEach((playerState, sessionId) => {
      stateSessionIds.add(sessionId);
    });

    // Retirer les joueurs absents du state (hors déco)
    Array.from(this.players.keys()).forEach(sessionId => {
      if (!stateSessionIds.has(sessionId)) this.removePlayer(sessionId);
    });

    // Créer / mettre à jour tous les joueurs
    state.players.forEach((playerState, sessionId) => {
      let player = this.players.get(sessionId);
      if (!player) {
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
      }
      player.targetX = playerState.x;
      player.targetY = playerState.y;
      if (playerState.isMoving !== undefined) player.isMoving = playerState.isMoving;
      if (playerState.direction) player.lastDirection = playerState.direction;

      // Anim auto
      if (player.isMoving && player.lastDirection) {
        const walkAnim = `walk_${player.lastDirection}`;
        if (this.scene.anims.exists(walkAnim)) player.anims.play(walkAnim, true);
      } else if (!player.isMoving && player.lastDirection) {
        const idleAnim = `idle_${player.lastDirection}`;
        if (this.scene.anims.exists(idleAnim)) player.anims.play(idleAnim, true);
      }
      // Toujours visible dans WorldRoom
      player.setVisible(true);
      player.setActive(true);
    });

    // Mon joueur prêt
    if (this.mySessionId && this.players.has(this.mySessionId) && !this._myPlayerIsReady) {
      this._myPlayerIsReady = true;
      if (this._myPlayerReadyCallback) {
        this._myPlayerReadyCallback(this.players.get(this.mySessionId));
      }
    }
  }

  // Pour WorldRoom : tu peux filtrer ici pour n'afficher que les joueurs de ta zone courante
  setPlayersZoneFilter(currentZone, playersState) {
    this.players.forEach((player, sessionId) => {
      const state = playersState?.get(sessionId);
      if (state && state.currentZone && state.currentZone !== currentZone) {
        player.setVisible(false);
        player.setActive(false);
      } else if (state && state.currentZone === currentZone) {
        player.setVisible(true);
        player.setActive(true);
      }
    });
  }

  update(delta = 16) {
    for (const [sessionId, player] of this.players) {
      if (!player || !player.scene) continue;
      // Indicateur vert
      if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 24;
      }
      // Lerp position
      if (player.targetX !== undefined && player.targetY !== undefined) {
        player.x += (player.targetX - player.x) * 0.18;
        player.y += (player.targetY - player.y) * 0.18;
      }
      // Snap smooth si besoin
      if (sessionId === this.mySessionId && player.snapLerpTimer && player.snapLerpTimer > 0) {
        const fastLerp = 0.45;
        player.x += (player.targetX - player.x) * fastLerp;
        player.y += (player.targetY - player.y) * fastLerp;
        player.snapLerpTimer -= delta / 1000;
        if (Math.abs(player.x - player.targetX) < 2 && Math.abs(player.y - player.targetY) < 2) {
          player.x = player.targetX;
          player.y = player.targetY;
          player.snapLerpTimer = 0;
        }
      }
    }
  }

  removePlayer(sessionId) {
    const player = this.players.get(sessionId);
    if (player) {
      if (player.anims && player.anims.isPlaying) player.anims.stop();
      if (player.indicator) { try { player.indicator.destroy(); } catch (e) {} }
      if (player.body && player.body.destroy) { try { player.body.destroy(); } catch (e) {} }
      try { player.destroy(); } catch (e) {}
      this.players.delete(sessionId);
    }
  }

  clearAllPlayers() {
    // ⚠️ Ne PAS appeler systématiquement sur transition WorldRoom !
    Array.from(this.players.keys()).forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    this._myPlayerIsReady = false;
  }

  getAllPlayers() { return this.isDestroyed ? [] : Array.from(this.players.values()); }
  getPlayerCount() { return this.isDestroyed ? 0 : this.players.size; }
  getPlayerInfo(sessionId) {
    if (this.isDestroyed) return null;
    const player = this.players.get(sessionId);
    if (player) {
      return { x: player.x, y: player.y, isMyPlayer: sessionId === this.mySessionId, direction: player.lastDirection, isMoving: player.isMoving };
    }
    return null;
  }

  // WorldRoom: pour callback UI etc
  onMyPlayerReady(callback) {
    this._myPlayerReadyCallback = callback;
    if (
      this.mySessionId &&
      this.players.has(this.mySessionId) &&
      !this._myPlayerIsReady
    ) {
      this._myPlayerIsReady = true;
      callback(this.players.get(this.mySessionId));
    }
  }

  // Sync sessionId si NetworkManager le change
  forceSyncSessionId() {
    if (this.scene.networkManager) {
      const networkSessionId = this.scene.networkManager.getSessionId();
      if (this.mySessionId !== networkSessionId) {
        this.setMySessionId(networkSessionId);
      }
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.clearAllPlayers();
  }
}
