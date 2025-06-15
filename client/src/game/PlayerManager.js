// src/game/PlayerManager.js - Version Phaser "dude" (sprite public)

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    console.log("PlayerManager initialisé");
  }

  setMySessionId(sessionId) {
    this.mySessionId = sessionId;
    console.log("Mon sessionId défini :", sessionId);
  }

  getMyPlayer() {
    const player = this.players.get(this.mySessionId);
    return player || null;
  }

  createPlayer(sessionId, x, y) {
    console.log("Création joueur :", sessionId, "à position", x, y);

    // Vérifier que le spritesheet dude existe
    if (!this.scene.textures.exists('dude')) {
      console.error("❌ Spritesheet 'dude' introuvable !");
      // Placeholder rouge
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff0000);
      graphics.fillRect(0, 0, 32, 48);
      graphics.generateTexture('player_placeholder', 32, 48);
      graphics.destroy();
      const player = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1);
      player.setDepth(1000);
      this.players.set(sessionId, player);
      return player;
    }

    // Créer le sprite avec le spritesheet dude (idle frame = 4)
    const player = this.scene.add.sprite(x, y, 'dude', 4).setOrigin(0.5, 1);

    // Config joueur
    player.setDepth(1000);
    player.setScale(1);

    // Animation par défaut
    if (this.scene.anims.exists('idle_down')) {
      player.play('idle_down');
    }
    player.lastDirection = 'down';
    player.isMoving = false;

    // Indicateur pour ton joueur
    if (sessionId === this.mySessionId) {
      const indicator = this.scene.add.circle(0, -32, 3, 0x00ff00);
      indicator.setDepth(1001);
      indicator.setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
      console.log("👤 Mon joueur créé avec spritesheet dude");
    } else {
      console.log("👥 Autre joueur créé :", sessionId);
    }

    this.players.set(sessionId, player);
    return player;
  }

  updatePlayers(state) {
    if (!state.players) {
      console.warn("❌ Pas de données players dans le state");
      return;
    }

    // Supprimer les joueurs déconnectés
    const currentSessionIds = new Set();
    state.players.forEach((playerState, sessionId) => {
      currentSessionIds.add(sessionId);
    });

    this.players.forEach((player, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        console.log("🚪 Joueur supprimé :", sessionId);
        this.removePlayer(sessionId);
      }
    });

    // Mettre à jour ou créer les joueurs
    state.players.forEach((playerState, sessionId) => {
      let player = this.players.get(sessionId);

      if (!player) {
        // Créer un nouveau joueur
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
      } else {
        // Mettre à jour la position avec interpolation fluide
        const distance = Phaser.Math.Distance.Between(
          player.x, player.y,
          playerState.x, playerState.y
        );

        if (distance > 5) {
          // Tween fluide
          this.scene.tweens.add({
            targets: player,
            x: playerState.x,
            y: playerState.y,
            duration: 100,
            ease: 'Linear'
          });

          // Calcul direction
          const direction = this.calculateDirection(player.x, player.y, playerState.x, playerState.y);
          this.playWalkAnimation(player, direction);
          player.isMoving = true;
        } else {
          // Petit déplacement
          player.x = playerState.x;
          player.y = playerState.y;

          // Animation idle
          this.playIdleAnimation(player);
          player.isMoving = false;
        }

        // Update indicator
        if (player.indicator) {
          player.indicator.x = playerState.x;
          player.indicator.y = playerState.y - 32;
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
    // Phaser "dude" a seulement gauche et droite (walk), donc on adapte :
    let animKey = '';
    if (direction === 'left' || direction === 'right') {
      animKey = `walk_${direction}`;
    } else {
      animKey = `idle_down`; // Pas de walk up/down pour ce sprite, fallback idle
    }

    if (this.scene.anims.exists(animKey)) {
      player.play(animKey, true);
      player.lastDirection = direction;
    } else {
      player.setFrame(4); // Idle frame centrale
    }
  }

  playIdleAnimation(player) {
    // Idle = frame centrale (4)
    player.stop();
    player.setFrame(4);
  }

  removePlayer(sessionId) {
    const player = this.players.get(sessionId);
    if (player) {
      if (player.indicator) player.indicator.destroy();
      player.destroy();
      this.players.delete(sessionId);
      console.log("👋 Joueur retiré :", sessionId);
    }
  }

  playPlayerAnimation(sessionId, animationKey) {
    const player = this.players.get(sessionId);
    if (player && this.scene.anims.exists(animationKey)) {
      player.play(animationKey, true);
    }
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getPlayerCount() {
    return this.players.size;
  }

  getPlayerInfo(sessionId) {
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
    console.log("🧹 PlayerManager - Nettoyage");
    this.players.forEach((player, sessionId) => {
      this.removePlayer(sessionId);
    });
    this.players.clear();
  }
}
