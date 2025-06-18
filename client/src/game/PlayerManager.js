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

  /**
   * Crée le joueur (sprite et texte du nom)
   * @param {string} sessionId 
   * @param {number} x 
   * @param {number} y 
   * @param {string} name 
   * @returns {object}
   */
  createPlayer(sessionId, x, y, name = "Player") {
    if (this.isDestroyed) return null;

    // Placeholder si spritesheet manquant
    if (!this.scene.textures.exists('BoyWalk')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff0000);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture('player_placeholder', 32, 32);
      graphics.destroy();
      const sprite = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1).setScale(1);
      sprite.setDepth(5);
      // Texte du nom même sur placeholder
      const nameText = this.scene.add.text(x, y - 36, name, {
        font: '14px Arial',
        fill: '#fff',
        stroke: '#222',
        strokeThickness: 3,
        align: 'center'
      }).setOrigin(0.5, 1).setDepth(1000);
      this.players.set(sessionId, { sprite, nameText });
      return this.players.get(sessionId);
    }

    // Crée les animations une seule fois
    if (!this.animsCreated) {
      this.createAnimations();
      this.animsCreated = true;
    }

    // Sprite physique joueur
    const sprite = this.scene.physics.add.sprite(x, y, 'BoyWalk', 1).setOrigin(0.5, 1).setScale(1);
    sprite.setDepth(5);
    sprite.sessionId = sessionId;
    // Petite hitbox, bien centrée sur les pieds :
    sprite.body.setSize(12, 8);
    sprite.body.setOffset(10, 24);
    // Debug hitbox optionnel
    sprite.body.debugShowBody = true;
    sprite.body.debugBodyColor = 0xff0000;

    // Animation idle par défaut (face bas, frame centrale)
    if (this.scene.anims.exists('idle_down')) sprite.play('idle_down');
    sprite.lastDirection = 'down';
    sprite.isMoving = false;

    // ⭐️ Initialisation des positions cibles (nécessaire pour le lerp)
    sprite.targetX = x;
    sprite.targetY = y;

    // Nom du joueur affiché au-dessus
    const nameText = this.scene.add.text(x, y - 36, name, {
      font: '14px Arial',
      fill: '#fff',
      stroke: '#222',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5, 1).setDepth(1000);

    // Indicateur vert pour le joueur local
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(sprite.x, sprite.y - 24, 3, 0x00ff00)
        .setDepth(1001)
        .setStrokeStyle(1, 0x004400);
      sprite.indicator = indicator;
    }

    // On stocke sprite + nameText (important pour les updates et destroy)
    this.players.set(sessionId, { sprite, nameText });
    return this.players.get(sessionId);
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

      let playerObj = this.players.get(sessionId);

      // On récupère le nom
      const playerName = playerState.name || "Player";

      if (!playerObj) {
        playerObj = this.createPlayer(sessionId, playerState.x, playerState.y, playerName);
      } else {
        if (!playerObj.sprite.scene || playerObj.sprite.scene !== this.scene) {
          this.players.delete(sessionId);
          playerObj = this.createPlayer(sessionId, playerState.x, playerState.y, playerName);
          return;
        }
      }

      // Met à jour la position cible
      playerObj.sprite.targetX = playerState.x;
      playerObj.sprite.targetY = playerState.y;

      // Met à jour le texte du nom (au cas où le nom change en live)
      if (playerObj.nameText && playerObj.nameText.text !== playerName) {
        playerObj.nameText.setText(playerName);
      }

      // Met à jour la position du texte au-dessus du sprite
      playerObj.nameText.setPosition(playerObj.sprite.x, playerObj.sprite.y - 36);

      // Reste de l'update (anims, indicateur, etc.)
      if (playerState.isMoving !== undefined) {
        playerObj.sprite.isMoving = playerState.isMoving;
      }
      if (playerState.direction) {
        playerObj.sprite.lastDirection = playerState.direction;
      }

      if (playerObj.sprite.isMoving && playerObj.sprite.lastDirection) {
        const walkAnim = `walk_${playerObj.sprite.lastDirection}`;
        if (this.scene.anims.exists(walkAnim)) {
          playerObj.sprite.anims.play(walkAnim, true);
        }
      } else if (!playerObj.sprite.isMoving && playerObj.sprite.lastDirection) {
        const idleAnim = `idle_${playerObj.sprite.lastDirection}`;
        if (this.scene.anims.exists(idleAnim)) {
          playerObj.sprite.anims.play(idleAnim, true);
        }
      }

      if (playerObj.sprite.indicator && !this.isDestroyed) {
        playerObj.sprite.indicator.x = playerObj.sprite.x;
        playerObj.sprite.indicator.y = playerObj.sprite.y - 24;
      }
    });
  }

  // ⭐️ Nouvelle méthode update pour le lerp continu (et texte du nom qui suit)
  update() {
    const lerpFactor = 0.18; // Ajuste selon ton ressenti
    for (const [sessionId, playerObj] of this.players) {
      if (sessionId !== this.mySessionId) {
        if (playerObj.sprite.targetX !== undefined && playerObj.sprite.targetY !== undefined) {
          playerObj.sprite.x += (playerObj.sprite.targetX - playerObj.sprite.x) * lerpFactor;
          playerObj.sprite.y += (playerObj.sprite.targetY - playerObj.sprite.y) * lerpFactor;
        }
        // Update la position du nameText pour qu'il suive toujours
        playerObj.nameText.setPosition(playerObj.sprite.x, playerObj.sprite.y - 36);
      } else {
        // Même pour le joueur local (si tu veux le name flottant en permanence)
        playerObj.nameText.setPosition(playerObj.sprite.x, playerObj.sprite.y - 36);
      }
    }
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;
    const playerObj = this.players.get(sessionId);
    if (playerObj) {
      // Arrêter les animations
      if (playerObj.sprite.anims && playerObj.sprite.anims.isPlaying) {
        playerObj.sprite.anims.stop();
      }
      if (playerObj.sprite.indicator) {
        try { playerObj.sprite.indicator.destroy(); } catch (e) {}
      }
      if (playerObj.sprite.body && playerObj.sprite.body.destroy) {
        try { playerObj.sprite.body.destroy(); } catch (e) {}
      }
      try { playerObj.sprite.destroy(); } catch (e) {}
      // N'oublie pas de destroy le nameText !
      if (playerObj.nameText) {
        try { playerObj.nameText.destroy(); } catch (e) {}
      }
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
    const playerObj = this.players.get(sessionId);
    if (playerObj) {
      return {
        x: playerObj.sprite.x,
        y: playerObj.sprite.y,
        isMyPlayer: sessionId === this.mySessionId,
        direction: playerObj.sprite.lastDirection,
        isMoving: playerObj.sprite.isMoving
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
