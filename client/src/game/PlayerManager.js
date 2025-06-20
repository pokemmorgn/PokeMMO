// src/game/PlayerManager.js - Spritesheet 3x4 (bas-gauche-droite-haut), 100% Phaser 3 compatible
// ✅ VERSION CORRIGÉE POUR LE PROBLÈME DE SESSIONID

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.isDestroyed = false;
    this.animsCreated = false;
    this._myPlayerIsReady = false;
    this._myPlayerReadyCallback = null;
    this._hasWarnedMissingPlayer = false;
    console.log("%c[PlayerManager] Initialisé pour", "color:orange", scene.scene.key);

    // Ajoute la gestion du snap serveur
    if (scene.networkManager && scene.networkManager.room) {
      console.log("[PlayerManager] Ajout du listener snap sur networkManager.room");
      scene.networkManager.room.onMessage("snap", (data) => {
        console.log("[PlayerManager] Reçu SNAP (onMessage) :", data);
        this.snapMyPlayerTo(data.x, data.y);
      });
    }
  }

  setMySessionId(sessionId) {
    console.log("[PlayerManager] setMySessionId:", sessionId);
    
    // ✅ CORRECTION 1 : Si le sessionId change, effectuer un nettoyage sélectif
    if (this.mySessionId && this.mySessionId !== sessionId) {
      console.log(`[PlayerManager] ⚠️ SessionId changé: ${this.mySessionId} → ${sessionId}`);
      
      // Conserver le joueur local si il existe, mais changer sa clé
      const myPlayer = this.players.get(this.mySessionId);
      if (myPlayer) {
        console.log(`[PlayerManager] 🔄 Migration du joueur vers le nouveau sessionId`);
        this.players.delete(this.mySessionId);
        this.players.set(sessionId, myPlayer);
        myPlayer.sessionId = sessionId; // Mettre à jour la référence interne
        
        // ✅ NOUVEAU: Préserver l'état du joueur
        myPlayer.setVisible(true);
        myPlayer.setActive(true);
        if (myPlayer.indicator) {
          myPlayer.indicator.setVisible(true);
        }
      }
      
      // Nettoyer les autres joueurs (ils appartiennent à l'ancienne room)
      const playersToRemove = Array.from(this.players.keys()).filter(id => id !== sessionId);
      playersToRemove.forEach(id => {
        if (id !== sessionId) {
          console.log(`[PlayerManager] 🗑️ Suppression ancien joueur: ${id}`);
          this.removePlayer(id);
        }
      });
    }
    
    this.mySessionId = sessionId;
    this._myPlayerIsReady = false; // Reset du flag pour la nouvelle connexion
  }

getMyPlayer() {
  if (this.isDestroyed) {
    console.warn("[PlayerManager] getMyPlayer: MANAGER DETRUIT");
    return null;
  }
  
  const player = this.players.get(this.mySessionId) || null;

  if (!player) {
    // ✅ Un seul warning tant que le joueur est absent
    if (!this._hasWarnedMissingPlayer) {
      this._hasWarnedMissingPlayer = true;
      console.warn("[PlayerManager] getMyPlayer: Aucun joueur trouvé pour mySessionId", this.mySessionId, "| Sessions:", Array.from(this.players.keys()));
      this.debugPlayerState();
    }
  } else {
    // ✅ Réinitialise le flag quand le joueur réapparaît
    if (this._hasWarnedMissingPlayer) {
      this._hasWarnedMissingPlayer = false;
    }
  }

  return player;
}


  // ✅ NOUVELLE MÉTHODE : Debug de l'état des joueurs
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
        x: player.x,
        y: player.y,
        visible: player.visible,
        active: player.active,
        hasIndicator: !!player.indicator
      });
    });
  }

  snapMyPlayerTo(x, y) {
    const player = this.getMyPlayer();
    if (!player) {
      console.warn("[PlayerManager] snapMyPlayerTo: Aucun joueur local");
      return;
    }
    console.log("[PlayerManager] snapMyPlayerTo", { x, y, oldX: player.x, oldY: player.y });

    // Snap doux (lerp rapide)
    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0.20; // Lerp rapide sur 200ms

    // Si vraiment trop loin (ex: gros rollback), tu peux forcer direct :
    if (Math.abs(player.x - x) > 64 || Math.abs(player.y - y) > 64) {
      console.log("[PlayerManager] Snap forcé (rollback > 64px)");
      player.x = x;
      player.y = y;
      player.snapLerpTimer = 0;
    }
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) {
      console.error("[PlayerManager] createPlayer appelé alors que destroy déjà fait!");
      return null;
    }

    // ✅ CORRECTION 3 : Vérifier si le joueur existe déjà (éviter les doublons)
    if (this.players.has(sessionId)) {
      console.log(`[PlayerManager] Joueur ${sessionId} existe déjà, mise à jour position`);
      const existingPlayer = this.players.get(sessionId);
      existingPlayer.x = x;
      existingPlayer.y = y;
      existingPlayer.setVisible(true);
      existingPlayer.setActive(true);
      return existingPlayer;
    }

    // Placeholder si spritesheet manquant
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
      console.log("[PlayerManager] Placeholder créé pour", sessionId);
      return player;
    }

    // Crée les animations une seule fois
    if (!this.animsCreated) {
      console.log("[PlayerManager] Création des animations BoyWalk");
      this.createAnimations();
      this.animsCreated = true;
    }

    // Sprite physique joueur
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

    // ✅ CORRECTION 4 : Indicateur vert, toujours détruire l'ancien s'il existe
    if (sessionId === this.mySessionId) {
      if (player.indicator) { player.indicator.destroy(); }
      // Detruit tous les "Arc" verts restants (patch bourrin)
      this.scene.children.list
        .filter(obj => obj && obj.type === "Arc" && obj.fillColor === 0x00ff00)
        .forEach(obj => { try { obj.destroy(); } catch(e){} });
      const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
        .setDepth(1001)
        .setStrokeStyle(1, 0x004400);
      player.indicator = indicator;
      indicator.setVisible(true);
      console.log("[PlayerManager] Indicateur local créé pour", sessionId, indicator);
    }

    this.players.set(sessionId, player);
    console.log(`[PlayerManager] Joueur créé: ${sessionId} à (${x}, ${y}) (players.size=${this.players.size})`);
    this.logPlayers();
    return player;
  }

  // ✅ AMÉLIORATION : Logs plus détaillés
  logPlayers() {
    const playerList = Array.from(this.players.keys());
    console.log(`[PlayerManager] 👥 Map joueurs: [${playerList.join(', ')}] | Mon sessionId: ${this.mySessionId}`);
    
    if (playerList.length > 0 && this.mySessionId && !playerList.includes(this.mySessionId)) {
      console.warn(`[PlayerManager] ⚠️ Mon sessionId ${this.mySessionId} n'est pas dans la liste des joueurs!`);
    }
  }

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
    // Idles
    if (!anims.exists('idle_down')) anims.create({ key: 'idle_down', frames: [{ key: 'BoyWalk', frame: 1 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_left')) anims.create({ key: 'idle_left', frames: [{ key: 'BoyWalk', frame: 5 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_right')) anims.create({ key: 'idle_right', frames: [{ key: 'BoyWalk', frame: 9 }], frameRate: 1, repeat: 0 });
    if (!anims.exists('idle_up')) anims.create({ key: 'idle_up', frames: [{ key: 'BoyWalk', frame: 13 }], frameRate: 1, repeat: 0 });
  }

  updatePlayers(state) {
    console.log("State keys:", Array.from(state.players.keys()), "mySessionId:", this.mySessionId);
    if (this.isDestroyed) {
      console.warn("[PlayerManager] updatePlayers: MANAGER DETRUIT");
      return;
    }
    if (!this.scene || !this.scene.scene.isActive()) {
      console.warn("[PlayerManager] updatePlayers: SCENE INACTIVE");
      return;
    }
    if (this.scene.networkManager && this.scene.networkManager.isTransitioning) {
      console.warn("[PlayerManager] updatePlayers: TRANSITION EN COURS");
      return;
    }
    if (!state || !state.players) {
      console.warn("[PlayerManager] updatePlayers: Pas de state ou players");
      return;
    }
    
    // ✅ CORRECTION 5 : Vérification de synchronisation sessionId
    if (this.scene.networkManager) {
      const currentNetworkSessionId = this.scene.networkManager.getSessionId();
      if (this.mySessionId !== currentNetworkSessionId) {
        console.warn(`[PlayerManager] ⚠️ SessionId désynchronisé dans updatePlayers:`, {
          mySessionId: this.mySessionId,
          networkSessionId: currentNetworkSessionId
        });
        this.setMySessionId(currentNetworkSessionId);
      }
    }
    
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    
    console.log("[PlayerManager] updatePlayers() appelé, joueurs state.size =", state.players.size);
    console.log("[PlayerManager] Recherche de mySessionId =", this.mySessionId, "dans state:", Array.from(state.players.keys()));
    
    this.performUpdate(state);
  }

  performUpdate(state) {
    if (this.isDestroyed || !this.scene?.scene?.isActive()) {
      console.warn("[PlayerManager] performUpdate: MANAGER DETRUIT OU SCENE INACTIVE");
      return;
    }

    this.logPlayers();

    // Supprimer les joueurs déconnectés
    const currentSessionIds = new Set();
    state.players.forEach((playerState, sessionId) => {
      currentSessionIds.add(sessionId);
    });
    
    const playersToCheck = Array.from(this.players.keys());
    playersToCheck.forEach(sessionId => {
      if (!currentSessionIds.has(sessionId)) {
        console.warn("[PlayerManager] Suppression du joueur absent dans le state:", sessionId);
        this.removePlayer(sessionId);
      }
    });

    // Mettre à jour ou créer les joueurs
    state.players.forEach((playerState, sessionId) => {
      let player = this.players.get(sessionId);

      if (!player) {
        console.log("[PlayerManager] Aucun player pour", sessionId, "--> création");
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
      } else {
        if (!player.scene || player.scene !== this.scene) {
          console.warn("[PlayerManager] player.scene !== this.scene pour", sessionId, " (RE-creation forcée)");
          this.players.delete(sessionId);
          player = this.createPlayer(sessionId, playerState.x, playerState.y);
          return;
        }
      }

      // ✅ CORRECTION 6 : Vérifier et restaurer la visibilité
      if (!player.visible) {
        console.warn(`[PlayerManager] Joueur ${sessionId} invisible, restauration`);
        player.setVisible(true);
        player.setActive(true);
      }

      // Stocker la position cible
      player.targetX = playerState.x;
      player.targetY = playerState.y;

      // Gérer les animations proprement
      if (playerState.isMoving !== undefined) player.isMoving = playerState.isMoving;
      if (playerState.direction) player.lastDirection = playerState.direction;

      if (player.isMoving && player.lastDirection) {
        const walkAnim = `walk_${player.lastDirection}`;
        if (this.scene.anims.exists(walkAnim)) player.anims.play(walkAnim, true);
      } else if (!player.isMoving && player.lastDirection) {
        const idleAnim = `idle_${player.lastDirection}`;
        if (this.scene.anims.exists(idleAnim)) player.anims.play(idleAnim, true);
      }
    });

    // ✅ CORRECTION 7 : Notification joueur local prêt avec vérification sessionId
    if (this.mySessionId && this.players.has(this.mySessionId) && !this._myPlayerIsReady) {
      this._myPlayerIsReady = true;
      console.log(`[PlayerManager] ✅ Mon joueur est prêt avec sessionId: ${this.mySessionId}`);
      
      if (this._myPlayerReadyCallback) {
        console.log("[PlayerManager] onMyPlayerReady callback déclenché!");
        this._myPlayerReadyCallback(this.players.get(this.mySessionId));
      }
    }
    
    this.logPlayers();
  }

  // ⭐️ update = lerp + SYNC INDICATOR à chaque frame !
  update(delta = 16) {
    for (const [sessionId, player] of this.players) {
      if (!player || !player.scene) continue;

      // ✅ CORRECTION 8 : L'indicateur suit toujours le joueur
      if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 24;
      }

      // Joueurs autres que moi : lerp normal
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
    if (this.isDestroyed) {
      console.warn("[PlayerManager] removePlayer: MANAGER DETRUIT");
      return;
    }
    const player = this.players.get(sessionId);
    if (player) {
      console.warn(`[PlayerManager] removePlayer: destruction du sprite pour ${sessionId}`);
      if (player.anims && player.anims.isPlaying) player.anims.stop();
      if (player.indicator) { try { player.indicator.destroy(); } catch (e) {} }
      if (player.body && player.body.destroy) { try { player.body.destroy(); } catch (e) {} }
      try { player.destroy(); } catch (e) {}
      this.players.delete(sessionId);
      this.logPlayers();
    } else {
      console.warn(`[PlayerManager] removePlayer: appelé mais joueur introuvable ${sessionId}`);
    }
  }

  clearAllPlayers() {
    if (this.isDestroyed) {
      console.warn("[PlayerManager] clearAllPlayers: MANAGER DETRUIT");
      return;
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    const savedSessionId = this.mySessionId;
    const playersToRemove = Array.from(this.players.keys());
    console.log("[PlayerManager] clearAllPlayers() appelé, suppression de:", playersToRemove);
    playersToRemove.forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    this.mySessionId = savedSessionId;
    this._myPlayerIsReady = false;
    this.logPlayers();
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

  // ✅ NOUVELLE MÉTHODE : Vérification périodique de l'état du joueur
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

  // ✅ NOUVELLE MÉTHODE : Forcer la synchronisation du sessionId
  forceSyncSessionId() {
    if (this.scene.networkManager) {
      const networkSessionId = this.scene.networkManager.getSessionId();
      if (this.mySessionId !== networkSessionId) {
        console.log(`[PlayerManager] 🔄 Synchronisation forcée du sessionId: ${this.mySessionId} → ${networkSessionId}`);
        this.setMySessionId(networkSessionId);
      }
    }
  }

  destroy() {
    this.isDestroyed = true;
    console.warn("[PlayerManager] destroy() appelé");
    this.clearAllPlayers();
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
}
