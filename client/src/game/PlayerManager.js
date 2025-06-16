// src/game/PlayerManager.js - Version Sprite Simple "Boy" 32x32

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
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

    // -- SPRITE SIMPLE 32x32 --
    if (!this.scene.textures.exists('Boy')) {
      console.error("❌ Image 'Boy' introuvable !");
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

    // SPRITE FIXE (pas d'animation)
    const player = this.scene.physics.add.sprite(x, y, 'Boy').setOrigin(0.5, 1).setScale(1);
    player.setDepth(5);
    player.sessionId = sessionId;

    // Optionnel : hitbox simple adaptée au bas du sprite (pour 32x32)
    player.body.setSize(16, 10);   // Largeur 16px, hauteur 10px
    player.body.setOffset(8, 22);  // Décalage : centre bas du sprite

    // Indicateur pour ton joueur (facultatif)
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(0, -24, 3, 0x00ff00);
      indicator.setDepth(1001);
      indicator.setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
      console.log("👤 Mon joueur créé avec sprite Boy");
    } else {
      console.log("👥 Autre joueur créé :", sessionId);
    }

    this.players.set(sessionId, player);
    return player;
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
        // Mettre à jour l'indicateur
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