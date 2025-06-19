// src/game/PlayerManager.js - Spritesheet 3x4 (bas-gauche-droite-haut), 100% Phaser 3 compatible

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
    this.animsCreated = false;
    this._myPlayerIsReady = false;
    this._myPlayerReadyCallback = null;
    console.log("PlayerManager initialisé pour", scene.scene.key);

    // Ajoute la gestion du snap serveur
    if (scene.networkManager && scene.networkManager.room) {
      scene.networkManager.room.onMessage("snap", (data) => {
        this.snapMyPlayerTo(data.x, data.y);
      });
    }
  }

  setMySessionId(sessionId) { this.mySessionId = sessionId; }

  getMyPlayer() {
    if (this.isDestroyed) return null;
    return this.players.get(this.mySessionId) || null;
  }

  snapMyPlayerTo(x, y) {
    const player = this.getMyPlayer();
    if (!player) return;

    // Snap doux (lerp rapide)
    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0.20; // Lerp rapide sur 200ms (peux ajuster)

    // Si vraiment trop loin (ex: gros rollback), tu peux forcer direct :
    if (Math.abs(player.x - x) > 64 || Math.abs(player.y - y) > 64) {
      player.x = x;
      player.y = y;
      player.snapLerpTimer = 0;
    }
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
    player.body.debugShowBody = true;
    player.body.debugBodyColor = 0xff0000;

    // Animation idle par défaut (face bas, frame centrale)
    if (this.scene.anims.exists('idle_down')) player.play('idle_down');
    player.lastDirection = 'down';
    player.isMoving = false;

    // ⭐️ Initialisation des positions cibles (nécessaire pour le lerp)
    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0; // Pour snap smooth

    // ✅ S'assurer que le joueur est visible et actif
    player.setVisible(true);
    player.setActive(true);

    // --- CORRECTION : Indicateur vert, toujours détruire l'ancien s'il existe ---
    if (sessionId === this.mySessionId) {
      // Cherche s'il existe un indicateur orphelin et détruis-le
      if (player.indicator) { player.indicator.destroy(); }
      // Pour le cas où l'ancien joueur (avant transition) avait laissé un indicateur
      // on les détruit tous (patch bourrin)
      this.scene.children.list
        .filter(obj => obj && obj.type === "Arc" && obj.fillColor === 0x00ff00)
        .forEach(obj => { try { obj.destroy(); } catch(e){} });
      // Maintenant on crée l'indicateur frais
      const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
        .setDepth(1001)
        .setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
      indicator.setVisible(true);
      // Log pour vérif
      console.log('[PlayerManager] Indicateur local créé pour', sessionId, indicator);
    }

    this.players.set(sessionId, player);
    console.log(`[PlayerManager] Joueur créé: ${sessionId} à (${x}, ${y})`);
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

      // Vérifier et restaurer la visibilité
      if (!player.visible) {
        console.warn(`[PlayerManager] Joueur ${sessionId} invisible, restauration`);
        player.setVisible(true);
        player.setActive(true);
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
          player.anims.play(walkAnim, true);
        }
      } else if (!player.isMoving && player.lastDirection) {
        const idleAnim = `idle_${player.lastDirection}`;
        if (this.scene.anims.exists(idleAnim)) {
          player.anims.play(idleAnim, true);
        }
      }
    });

    // --- NOTIFIE si le joueur local vient juste d'être créé ---
    if (
      this.mySessionId &&
      this.players.has(this.mySessionId) &&
      !this._myPlayerIsReady
    ) {
      this._myPlayerIsReady = true;
      if (this._myPlayerReadyCallback) {
        this._myPlayerReadyCallback(this.players.get(this.mySessionId));
      }
    }
  }

  // ⭐️ update = lerp + SYNC INDICATOR à chaque frame !
  update(delta = 16) {
    for (const [sessionId, player] of this.players) {
      if (!player || !player.scene) continue;

      // --- Correction ici : l’indicateur suit toujours le joueur ---
      if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 24;
      }

      if (sessionId !== this.mySessionId) {
        if (player.targetX !== undefined && player.targetY !== undefined) {
          player.x += (player.targetX - player.x) * 0.18;
          player.y += (player.targetY - player.y) * 0.18;
        }
      } else {
        // Mon joueur : snap smooth si snap en cours
        if (player.snapLerpTimer && player.snapLerpTimer > 0) {
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
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;
    const player = this.players.get(sessionId);
    if (player) {
      // Arrêter les animations
      if (player.anims && player.anims.isPlaying) {
        player.anims.stop();
      }
      // Détruit l’indicateur proprement
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

    const savedSessionId = this.mySessionId;
    const playersToRemove = Array.from(this.players.keys());
    playersToRemove.forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    this.mySessionId = savedSessionId;
    this._myPlayerIsReady = false;
    console.log(`[PlayerManager] Joueurs nettoyés, sessionId conservé: ${this.mySessionId}`);
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

  checkPlayerState() {
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) {
      console.warn(`[PlayerManager] Joueur manquant!`);
      return false;
    }
    let fixed = false;
    if (!myPlayer.visible) {
      console.warn(`[PlayerManager] Joueur invisible, restauration`);
      myPlayer.setVisible(true);
      fixed = true;
    }
    if (!myPlayer.active) {
      console.warn(`[PlayerManager] Joueur inactif, restauration`);
      myPlayer.setActive(true);
      fixed = true;
    }
    if (myPlayer.indicator && !myPlayer.indicator.visible) {
      console.warn(`[PlayerManager] Indicateur invisible, restauration`);
      myPlayer.indicator.setVisible(true);
      fixed = true;
    }
    if (fixed) {
      console.log(`[PlayerManager] État du joueur corrigé`);
    }
    return true;
  }

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

  destroy() {
    this.isDestroyed = true;
    this.clearAllPlayers();
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}
