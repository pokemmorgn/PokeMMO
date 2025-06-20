// src/game/PlayerManager.js - VERSION SIMPLE SANS FILTRAGE
// ✅ Affiche TOUS les joueurs reçus, pas de filtrage complexe

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
    this.animsCreated = false;
    this._myPlayerIsReady = false;
    this._myPlayerReadyCallback = null;
    
    console.log("%c[PlayerManager] Initialisé pour", "color:orange", scene.scene.key);

    // Gestion du snap serveur
    if (scene.networkManager && scene.networkManager.room) {
      scene.networkManager.room.onMessage("snap", (data) => {
        console.log("[PlayerManager] Reçu SNAP :", data);
        this.snapMyPlayerTo(data.x, data.y);
      });
    }
  }

  setMySessionId(sessionId) {
    console.log("[PlayerManager] setMySessionId:", sessionId, "| Ancien:", this.mySessionId);
    this.mySessionId = sessionId;
    this._myPlayerIsReady = false;
  }

  getMyPlayer() {
    if (this.isDestroyed) return null;
    return this.players.get(this.mySessionId) || null;
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) return null;

    // Si le joueur existe déjà, le mettre à jour
    if (this.players.has(sessionId)) {
      const existingPlayer = this.players.get(sessionId);
      existingPlayer.x = x;
      existingPlayer.y = y;
      existingPlayer.targetX = x;
      existingPlayer.targetY = y;
      existingPlayer.setVisible(true);
      existingPlayer.setActive(true);
      return existingPlayer;
    }

    console.log(`[PlayerManager] 🆕 Création joueur: ${sessionId} à (${x}, ${y})`);

    // Vérifier si le sprite existe
    if (!this.scene.textures.exists('BoyWalk')) {
      console.warn("[PlayerManager] Texture BoyWalk manquante, création placeholder");
      return this.createPlaceholderPlayer(sessionId, x, y);
    }

    // Créer les animations une seule fois
    if (!this.animsCreated) {
      this.createAnimations();
      this.animsCreated = true;
    }

    // Créer le sprite joueur
    const player = this.scene.physics.add.sprite(x, y, 'BoyWalk', 1)
      .setOrigin(0.5, 1)
      .setScale(1)
      .setDepth(5);
    
    player.sessionId = sessionId;
    player.body.setSize(12, 8);
    player.body.setOffset(10, 24);
    
    // Propriétés de mouvement
    player.targetX = x;
    player.targetY = y;
    player.lastDirection = 'down';
    player.isMoving = false;
    player.snapLerpTimer = 0;
    
    // Animation initiale
    if (this.scene.anims.exists('idle_down')) {
      player.play('idle_down');
    }
    
    // Visibilité
    player.setVisible(true);
    player.setActive(true);

    // Indicateur vert pour MON joueur uniquement
    if (sessionId === this.mySessionId) {
      this.createLocalPlayerIndicator(player);
    }

    this.players.set(sessionId, player);
    console.log(`[PlayerManager] ✅ Joueur créé: ${sessionId} (total: ${this.players.size})`);
    
    return player;
  }

  createPlaceholderPlayer(sessionId, x, y) {
    // Créer un carré rouge simple
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xff0000);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player_placeholder', 32, 32);
    graphics.destroy();
    
    const player = this.scene.add.sprite(x, y, 'player_placeholder')
      .setOrigin(0.5, 1)
      .setDepth(5);
    
    player.sessionId = sessionId;
    player.targetX = x;
    player.targetY = y;
    player.setVisible(true);
    player.setActive(true);
    
    this.players.set(sessionId, player);
    return player;
  }

  createLocalPlayerIndicator(player) {
    // Nettoyer l'ancien indicateur
    if (player.indicator) {
      try { player.indicator.destroy(); } catch(e) {}
    }
    
    // Créer l'indicateur vert
    const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
      .setDepth(1001)
      .setStrokeStyle(1, 0x004400);
    
    player.indicator = indicator;
    indicator.setVisible(true);
  }

  // ✅ VERSION SIMPLIFIÉE: Traiter TOUS les joueurs reçus
  updatePlayers(state) {
    if (this.isDestroyed || !state || !state.players) {
        return;
    }
    
    console.log(`[PlayerManager] 📊 Update avec ${state.players.size || 0} joueurs`);

    // Convertir en Map si nécessaire
    let playersMap;
    if (state.players instanceof Map) {
        playersMap = state.players;
    } else if (state.players && typeof state.players === 'object') {
        playersMap = new Map(Object.entries(state.players));
    } else {
        console.warn("[PlayerManager] State.players invalide");
        return;
    }

    // Supprimer les joueurs qui ne sont plus dans le state
    const currentSessionIds = new Set(playersMap.keys());
    const playersToRemove = Array.from(this.players.keys()).filter(sessionId => 
        !currentSessionIds.has(sessionId)
    );
    
    playersToRemove.forEach(sessionId => {
        console.log(`[PlayerManager] 🗑️ Suppression joueur: ${sessionId}`);
        this.removePlayer(sessionId);
    });

    // ✅ SIMPLE: Traiter TOUS les joueurs sans filtrage
    const reservedKeys = ["$items", "$indexes", "deletedItems"];
    playersMap.forEach((playerState, sessionId) => {
        // Ignorer les clés système de Colyseus
        if (reservedKeys.includes(sessionId)) return;
        
        console.log(`[PlayerManager] 🔄 Traitement joueur: ${sessionId}`);
        this.updateOrCreatePlayer(sessionId, playerState);
    });

    // Vérifier si mon joueur est prêt
    this.checkMyPlayerReady();
  }

  // ✅ SIMPLE: Créer ou mettre à jour un joueur
  updateOrCreatePlayer(sessionId, playerState) {
    let player = this.players.get(sessionId);
    
    // Créer le joueur s'il n'existe pas
    if (!player) {
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
        if (!player) return;
    }
    
    // ✅ TOUJOURS s'assurer que le joueur est visible
    if (!player.visible) {
        console.log(`[PlayerManager] 🔧 Restauration visibilité: ${sessionId}`);
        player.setVisible(true);
        player.setActive(true);
    }
    
    // Mettre à jour les données du joueur
    this.updatePlayerFromState(player, playerState);
  }

  updatePlayerFromState(player, playerState) {
    // Position cible
    player.targetX = playerState.x;
    player.targetY = playerState.y;

    // Direction et mouvement
    if (playerState.direction) {
        player.lastDirection = playerState.direction;
    }
    if (playerState.isMoving !== undefined) {
        player.isMoving = playerState.isMoving;
    }

    // Animation
    this.updatePlayerAnimation(player);
  }

  updatePlayerAnimation(player) {
    if (!player.anims) return; // Pas d'animation pour les placeholders
    
    if (player.isMoving && player.lastDirection) {
        const walkAnim = `walk_${player.lastDirection}`;
        if (this.scene.anims.exists(walkAnim)) {
            player.anims.play(walkAnim, true);
        }
    } else if (player.lastDirection) {
        const idleAnim = `idle_${player.lastDirection}`;
        if (this.scene.anims.exists(idleAnim)) {
            player.anims.play(idleAnim, true);
        }
    }
  }

  checkMyPlayerReady() {
    if (this.mySessionId && this.players.has(this.mySessionId) && !this._myPlayerIsReady) {
        this._myPlayerIsReady = true;
        console.log(`[PlayerManager] ✅ Mon joueur est prêt: ${this.mySessionId}`);

        if (this._myPlayerReadyCallback) {
            this._myPlayerReadyCallback(this.players.get(this.mySessionId));
        }
    }
  }

  // Update à chaque frame
  update(delta = 16) {
    for (const [sessionId, player] of this.players) {
        if (!player || !player.scene) continue;

        // Synchroniser l'indicateur
        if (player.indicator) {
            player.indicator.x = player.x;
            player.indicator.y = player.y - 24;
        }

        // Interpolation de position
        this.updatePlayerPosition(player, sessionId, delta);
    }
  }

  updatePlayerPosition(player, sessionId, delta) {
    const isMyPlayer = (sessionId === this.mySessionId);
    
    if (!isMyPlayer) {
        // Autres joueurs : interpolation douce
        if (player.targetX !== undefined && player.targetY !== undefined) {
            player.x += (player.targetX - player.x) * 0.2;
            player.y += (player.targetY - player.y) * 0.2;
        }
    } else {
        // Mon joueur : snap plus rapide si nécessaire
        if (player.snapLerpTimer && player.snapLerpTimer > 0) {
            const fastLerp = 0.5;
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

  snapMyPlayerTo(x, y) {
    const player = this.getMyPlayer();
    if (!player) return;
    
    console.log("[PlayerManager] snapMyPlayerTo", { x, y });
    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0.3;

    // Snap immédiat si trop loin
    if (Math.abs(player.x - x) > 64 || Math.abs(player.y - y) > 64) {
        player.x = x;
        player.y = y;
        player.snapLerpTimer = 0;
    }
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;
    
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
    if (this.isDestroyed) return;
    
    Array.from(this.players.keys()).forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    this._myPlayerIsReady = false;
  }

  // Animations
  createAnimations() {
    const anims = this.scene.anims;
    
    if (!anims.exists('walk_down')) {
        anims.create({ key: 'walk_down', frames: anims.generateFrameNumbers('BoyWalk', { start: 0, end: 3 }), frameRate: 15, repeat: -1 });
    }
    if (!anims.exists('walk_left')) {
        anims.create({ key: 'walk_left', frames: anims.generateFrameNumbers('BoyWalk', { start: 4, end: 7 }), frameRate: 15, repeat: -1 });
    }
    if (!anims.exists('walk_right')) {
        anims.create({ key: 'walk_right', frames: anims.generateFrameNumbers('BoyWalk', { start: 8, end: 11 }), frameRate: 15, repeat: -1 });
    }
    if (!anims.exists('walk_up')) {
        anims.create({ key: 'walk_up', frames: anims.generateFrameNumbers('BoyWalk', { start: 12, end: 14 }), frameRate: 15, repeat: -1 });
    }
    if (!anims.exists('idle_down')) anims.create({ key: 'idle_down', frames: [{ key: 'BoyWalk', frame: 1 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_left')) anims.create({ key: 'idle_left', frames: [{ key: 'BoyWalk', frame: 5 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_right')) anims.create({ key: 'idle_right', frames: [{ key: 'BoyWalk', frame: 9 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_up')) anims.create({ key: 'idle_up', frames: [{ key: 'BoyWalk', frame: 13 }], frameRate: 1, repeat: 0 });
  }

  // Méthodes utilitaires
  getAllPlayers() {
    return this.isDestroyed ? [] : Array.from(this.players.values());
  }
  
  getPlayerCount() {
    return this.isDestroyed ? 0 : this.players.size;
  }

  onMyPlayerReady(callback) {
    this._myPlayerReadyCallback = callback;
    
    // Vérifier immédiatement si mon joueur existe
    if (this.mySessionId && this.players.has(this.mySessionId)) {
        this._myPlayerIsReady = true;
        callback(this.players.get(this.mySessionId));
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.clearAllPlayers();
  }
}
