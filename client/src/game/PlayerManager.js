// src/game/PlayerManager.js - Version corrigée pour éviter la duplication

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false; // ✅ AJOUT : Flag pour éviter les opérations sur un manager détruit
    console.log("PlayerManager initialisé pour", scene.scene.key);
  }

  setMySessionId(sessionId) {
    this.mySessionId = sessionId;
    console.log("Mon sessionId défini :", sessionId);
  }

  getMyPlayer() {
    if (this.isDestroyed) return null; // ✅ AJOUT : Protection
    const player = this.players.get(this.mySessionId);
    return player || null;
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) {
      console.warn("PlayerManager détruit, création de joueur ignorée");
      return null;
    }

    // ✅ AJOUT : Vérifier qu'on ne crée pas un joueur qui existe déjà
    if (this.players.has(sessionId)) {
      console.warn(`Joueur ${sessionId} existe déjà, mise à jour de position seulement`);
      const existingPlayer = this.players.get(sessionId);
      existingPlayer.x = x;
      existingPlayer.y = y;
      return existingPlayer;
    }

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
      player.setDepth(5);
      this.players.set(sessionId, player);
      return player;
    }

    // Créer le sprite avec le spritesheet dude (idle frame = 4)
    const player = this.scene.physics.add.sprite(x, y, 'dude', 4).setOrigin(0.5, 1);

    // Config joueur
    player.setDepth(5);
    player.setScale(0.5);
    player.body.setSize(
      player.width * 0.5,
      player.height * 0.5
    );
    player.body.setOffset(
      (player.width - player.width * 0.5) / 2,
      player.height * 0.5
    );

    // Animation par défaut
    if (this.scene.anims.exists('idle_down')) {
      player.play('idle_down');
    }
    player.lastDirection = 'down';
    player.isMoving = false;

    // ✅ AJOUT : Marquer le sessionId sur le player pour debug
    player.sessionId = sessionId;

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
    // ✅ VÉRIFICATIONS DE SÉCURITÉ RENFORCÉES
    if (this.isDestroyed) {
      console.warn("PlayerManager détruit, updatePlayers ignoré");
      return;
    }

    if (!this.scene || !this.scene.scene.isActive()) {
      console.warn("Scène inactive, updatePlayers ignoré");
      return;
    }

    // ✅ AJOUT : Vérifier si le NetworkManager est en transition
    if (this.scene.networkManager && this.scene.networkManager.isTransitioning) {
      console.log("NetworkManager en transition, updatePlayers ignoré");
      return;
    }

    if (!state.players) {
      console.warn("❌ Pas de données players dans le state");
      return;
    }

    // ✅ MODIFICATION : Débounce pour éviter les mises à jour trop fréquentes
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.performUpdate(state);
    }, 16); // ~60fps
  }

  performUpdate(state) {
    if (this.isDestroyed || !this.scene?.scene?.isActive()) return;

    // Supprimer les joueurs déconnectés
    const currentSessionIds = new Set();
    state.players.forEach((playerState, sessionId) => {
      currentSessionIds.add(sessionId);
    });

    // ✅ MODIFICATION : Copie du Map pour éviter les modifications concurrentes
    const playersToCheck = new Map(this.players);
    playersToCheck.forEach((player, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        console.log("🚪 Joueur supprimé :", sessionId);
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
        // ✅ VÉRIFICATION : S'assurer que le player existe encore dans la scène
        if (!this.scene.children.exists(player)) {
          console.warn(`Player ${sessionId} n'existe plus dans la scène, recréation`);
          this.players.delete(sessionId);
          player = this.createPlayer(sessionId, playerState.x, playerState.y);
          return;
        }

        // ✅ MODIFICATION : Différencier le joueur local des autres
        if (sessionId === this.mySessionId) {
          // Pour MON joueur : mise à jour directe, sans interpolation
          // (le mouvement est géré par handleMovement dans BaseZoneScene)
          
          // Synchronisation périodique avec le serveur (anti-désync)
          const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            playerState.x, playerState.y
          );
          
          if (distance > 50) { // Désynchronisation importante
            console.log(`🔄 Correction de position pour mon joueur: ${distance}px`);
            player.x = playerState.x;
            player.y = playerState.y;
          }
        } else {
          // Pour LES AUTRES joueurs : interpolation fluide
          const distance = Phaser.Math.Distance.Between(
            player.x, player.y,
            playerState.x, playerState.y
          );

          if (distance > 5) {
            // ✅ MODIFICATION : Vérifier que le tween peut être créé
            if (this.scene.tweens && !player.isBeingTweened) {
              player.isBeingTweened = true;
              this.scene.tweens.add({
                targets: player,
                x: playerState.x,
                y: playerState.y,
                duration: 100,
                ease: 'Linear',
                onComplete: () => {
                  if (player && !this.isDestroyed) {
                    player.isBeingTweened = false;
                  }
                }
              });
            } else {
              // Fallback si pas de tween disponible
              player.x = playerState.x;
              player.y = playerState.y;
            }

            // Calcul direction pour animation
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
        }

        // Update indicator
        if (player.indicator && !this.isDestroyed) {
          player.indicator.x = player.x;
          player.indicator.y = player.y - 32;
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
    if (this.isDestroyed || !player || !player.scene || !direction) {
      return;
    }

    // Vérifier que le player existe encore dans la scène
    if (!player.scene.children.exists(player)) {
      return;
    }

    let animKey = '';
    if (direction === 'left' || direction === 'right') {
      animKey = `walk_${direction}`;
    } else {
      animKey = `idle_down`;
    }

    // Vérifier que l'animation existe dans la scène
    if (!player.scene.anims.exists(animKey)) {
      player.setFrame(4); // Fallback frame idle
      return;
    }

    try {
      player.play(animKey, true);
      player.lastDirection = direction;
    } catch (error) {
      console.warn(`Erreur lors de l'animation ${animKey}:`, error);
      player.setFrame(4);
    }
  }

  playIdleAnimation(player) {
    if (this.isDestroyed || !player || !player.scene) {
      return;
    }

    // Vérifier que le player existe encore dans la scène
    if (!player.scene.children.exists(player)) {
      return;
    }

    try {
      player.stop();
      player.setFrame(4);
    } catch (error) {
      console.warn('Erreur lors de l\'animation idle:', error);
    }
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;

    const player = this.players.get(sessionId);
    if (player) {
      // ✅ AMÉLIORATION : Nettoyage plus robuste
      if (player.indicator) {
        try {
          player.indicator.destroy();
        } catch (e) {
          console.warn("Erreur destruction indicator:", e);
        }
      }
      
      if (player.body && player.body.destroy) {
        try {
          player.body.destroy();
        } catch (e) {
          console.warn("Erreur destruction body:", e);
        }
      }
      
      try {
        player.destroy();
      } catch (e) {
        console.warn("Erreur destruction player:", e);
      }
      
      this.players.delete(sessionId);
      console.log("👋 Joueur retiré :", sessionId);
    }
  }

  // ✅ MÉTHODE AMÉLIORÉE POUR NETTOYER TOUS LES JOUEURS
  clearAllPlayers() {
    if (this.isDestroyed) return;

    console.log(`🧹 Nettoyage de tous les joueurs (${this.players.size})`);
    
    // ✅ MODIFICATION : Nettoyer les timeouts
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    // ✅ MODIFICATION : Copie pour éviter les modifications concurrentes
    const playersToRemove = Array.from(this.players.keys());
    playersToRemove.forEach(sessionId => {
      this.removePlayer(sessionId);
    });
    
    this.players.clear();
    this.mySessionId = null;
  }

  playPlayerAnimation(sessionId, animationKey) {
    if (this.isDestroyed) return;

    const player = this.players.get(sessionId);
    if (player && this.scene.anims.exists(animationKey)) {
      try {
        player.play(animationKey, true);
      } catch (error) {
        console.warn(`Erreur animation ${animationKey}:`, error);
      }
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

  // ✅ NOUVELLE MÉTHODE : Marquer comme détruit
  destroy() {
    console.log("🧹 PlayerManager - Destruction");
    this.isDestroyed = true;
    this.clearAllPlayers();
    
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}