// src/game/PlayerManager.js - VERSION CORRIGÉE POUR TRANSITIONS
// ✅ Corrections pour la synchronisation et la visibilité des autres joueurs après transition

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
    
    // ✅ NOUVEAU: Système de synchronisation amélioré
    this._pendingSessionId = null;
    this._isResynchronizing = false;
    this._lastStateUpdate = 0;
    
    // ✅ NOUVEAU: Gestion de zone pour filtrage
    this.currentZone = null;
    this._zoneConfirmed = false;
    this._lastZoneUpdate = 0;
    
    console.log("%c[PlayerManager] Initialisé pour", "color:orange", scene.scene.key);

    // Gestion du snap serveur
    if (scene.networkManager && scene.networkManager.room) {
      console.log("[PlayerManager] Ajout du listener snap sur networkManager.room");
      scene.networkManager.room.onMessage("snap", (data) => {
        console.log("[PlayerManager] Reçu SNAP (onMessage) :", data);
        this.snapMyPlayerTo(data.x, data.y);
      });
    }
  }

  setMySessionId(sessionId) {
    console.log("[PlayerManager] setMySessionId:", sessionId, "| Ancien:", this.mySessionId);
    
    // ✅ AMÉLIORATION 1: Gestion plus intelligente du changement de sessionId
    if (this.mySessionId === sessionId) {
      console.log("[PlayerManager] SessionId identique, pas de changement nécessaire");
      return;
    }

    // Si on a déjà un sessionId différent, préparer la migration
    if (this.mySessionId && this.mySessionId !== sessionId) {
      console.log(`[PlayerManager] ⚠️ Migration sessionId: ${this.mySessionId} → ${sessionId}`);
      this._pendingSessionId = sessionId;
      this.migratePlayerSession(this.mySessionId, sessionId);
    } else {
      // Premier sessionId ou pas d'ancien joueur
      this.mySessionId = sessionId;
      this._pendingSessionId = null;
    }
    
    this._myPlayerIsReady = false;
  }

  // ✅ NOUVELLE MÉTHODE: Synchronisation de zone
  setCurrentZone(zone) {
    const oldZone = this.currentZone;
    this.currentZone = zone;
    this._zoneConfirmed = true;
    this._lastZoneUpdate = Date.now();
    
    console.log(`[PlayerManager] 🌍 Zone mise à jour: ${oldZone} → ${zone}`);
    
    // ✅ FORCER un refresh des joueurs visibles après changement de zone
    this.time.delayedCall(100, () => {
      this.refreshPlayersVisibility();
    });
  }

  // ✅ NOUVELLE MÉTHODE: Actualiser la visibilité de tous les joueurs
  refreshPlayersVisibility() {
    console.log(`[PlayerManager] 🔄 Refresh visibilité joueurs pour zone: ${this.currentZone}`);
    
    let visibleCount = 0;
    let hiddenCount = 0;
    
    this.players.forEach((player, sessionId) => {
      // Toujours garder notre joueur visible
      if (sessionId === this.mySessionId || sessionId === this._pendingSessionId) {
        if (!player.visible) {
          player.setVisible(true);
          player.setActive(true);
          console.log(`[PlayerManager] ✅ Mon joueur restauré: ${sessionId}`);
        }
        visibleCount++;
        return;
      }
      
      // ✅ VÉRIFIER SI LE JOUEUR DOIT ÊTRE VISIBLE DANS CETTE ZONE
      const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
      
      if (shouldBeVisible && !player.visible) {
        player.setVisible(true);
        player.setActive(true);
        visibleCount++;
        console.log(`[PlayerManager] 👀 Joueur ${sessionId} rendu visible`);
      } else if (!shouldBeVisible && player.visible) {
        player.setVisible(false);
        player.setActive(false);
        hiddenCount++;
        console.log(`[PlayerManager] 👻 Joueur ${sessionId} masqué (hors zone)`);
      } else if (shouldBeVisible) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    });
    
    console.log(`[PlayerManager] 📊 Visibilité: ${visibleCount} visibles, ${hiddenCount} masqués`);
  }

  // ✅ NOUVELLE MÉTHODE: Vérifier si un joueur doit être visible dans la zone actuelle
  shouldPlayerBeVisibleInCurrentZone(player, sessionId) {
    // Notre joueur est toujours visible
    if (sessionId === this.mySessionId || sessionId === this._pendingSessionId) {
      return true;
    }
    
    // Si pas de zone confirmée, afficher par défaut
    if (!this._zoneConfirmed || !this.currentZone) {
      return true;
    }
    
    // ✅ VÉRIFIER LA ZONE DU JOUEUR via le networkManager
    if (this.scene.networkManager?.room?.state?.players) {
      const playerState = this.scene.networkManager.room.state.players.get(sessionId);
      if (playerState && playerState.currentZone) {
        const inSameZone = playerState.currentZone === this.currentZone;
        console.log(`[PlayerManager] 🔍 Joueur ${sessionId}: zone="${playerState.currentZone}" vs actuelle="${this.currentZone}" → ${inSameZone ? 'VISIBLE' : 'MASQUÉ'}`);
        return inSameZone;
      }
    }
    
    // Si pas d'info de zone sur le joueur, le masquer par sécurité après transition
    if (this._lastZoneUpdate && (Date.now() - this._lastZoneUpdate) < 5000) {
      console.log(`[PlayerManager] 🔍 Joueur ${sessionId}: pas d'info zone récente, masqué temporairement`);
      return false;
    }
    
    // Par défaut après délai, afficher
    return true;
  }

  // ✅ NOUVELLE MÉTHODE: Migration intelligente entre sessions
  migratePlayerSession(oldSessionId, newSessionId) {
    console.log(`[PlayerManager] 🔄 Migration du joueur: ${oldSessionId} → ${newSessionId}`);
    
    const oldPlayer = this.players.get(oldSessionId);
    if (oldPlayer) {
      // Conserver les données importantes du joueur
      const playerData = {
        x: oldPlayer.x,
        y: oldPlayer.y,
        visible: oldPlayer.visible,
        active: oldPlayer.active,
        lastDirection: oldPlayer.lastDirection,
        isMoving: oldPlayer.isMoving,
        indicator: oldPlayer.indicator
      };
      
      // Supprimer l'ancienne entrée
      this.players.delete(oldSessionId);
      
      // Mettre à jour les références
      oldPlayer.sessionId = newSessionId;
      this.players.set(newSessionId, oldPlayer);
      
      // Restaurer la visibilité si nécessaire
      if (!oldPlayer.visible) {
        oldPlayer.setVisible(true);
        oldPlayer.setActive(true);
      }
      
      console.log(`[PlayerManager] ✅ Joueur migré avec succès`);
    }
    
    // ✅ NE PAS nettoyer les autres joueurs automatiquement - laisser le serveur décider
    console.log(`[PlayerManager] ℹ️ Conservation des autres joueurs pour vérification serveur`);
    
    this.mySessionId = newSessionId;
    this._pendingSessionId = null;
  }

  // ✅ MÉTHODE CORRIGÉE ET NETTOYÉE
  getMyPlayer() {
    if (this.isDestroyed) {
      console.warn("[PlayerManager] getMyPlayer: MANAGER DETRUIT");
      return null;
    }
    
    const sessionIdToCheck = this._pendingSessionId || this.mySessionId;
    const player = this.players.get(sessionIdToCheck) || null;

    if (!player) {
      if (!this._hasWarnedMissingPlayer) {
        this._hasWarnedMissingPlayer = true;
        console.warn("[PlayerManager] getMyPlayer: Aucun joueur trouvé pour sessionId", sessionIdToCheck);
        console.warn("Sessions disponibles:", Array.from(this.players.keys()));
        this.debugPlayerState();
      }
    } else {
      // Reset le warning seulement
      if (this._hasWarnedMissingPlayer) {
        this._hasWarnedMissingPlayer = false;
        console.log("[PlayerManager] ✅ Joueur retrouvé!");
      }
    }

    return player;
  }

  debugPlayerState() {
    console.log("%c[PlayerManager] 🔍 DEBUG État des joueurs:", "color:red; font-weight:bold");
    console.log("- mySessionId:", this.mySessionId);
    console.log("- _pendingSessionId:", this._pendingSessionId);
    console.log("- players.size:", this.players.size);
    console.log("- sessionIds disponibles:", Array.from(this.players.keys()));
    console.log("- currentZone:", this.currentZone);
    console.log("- _zoneConfirmed:", this._zoneConfirmed);
    
    if (this.scene.networkManager) {
      console.log("- networkManager.sessionId:", this.scene.networkManager.getSessionId());
      console.log("- networkManager.isConnected:", this.scene.networkManager.isConnected);
      console.log("- networkManager.currentZone:", this.scene.networkManager.getCurrentZone());
    }
    
    this.players.forEach((player, sessionId) => {
      const isMyPlayer = sessionId === this.mySessionId || sessionId === this._pendingSessionId;
      console.log(`- Joueur ${sessionId}${isMyPlayer ? ' (MOI)' : ''}:`, {
        x: player.x,
        y: player.y,
        visible: player.visible,
        active: player.active,
        hasIndicator: !!player.indicator,
        sessionIdMatch: sessionId === this.mySessionId
      });
    });
  }

  createPlayer(sessionId, x, y) {
    if (this.isDestroyed) {
      console.error("[PlayerManager] createPlayer appelé alors que destroy déjà fait!");
      return null;
    }

    // ✅ AMÉLIORATION 3: Vérifier si le joueur existe déjà
    if (this.players.has(sessionId)) {
      console.log(`[PlayerManager] Joueur ${sessionId} existe déjà, mise à jour position`);
      const existingPlayer = this.players.get(sessionId);
      this.updateExistingPlayer(existingPlayer, x, y);
      return existingPlayer;
    }

    console.log(`[PlayerManager] 🆕 Création nouveau joueur: ${sessionId} à (${x}, ${y})`);

    // Placeholder si spritesheet manquant
    if (!this.scene.textures.exists('BoyWalk')) {
      return this.createPlaceholderPlayer(sessionId, x, y);
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

    // ✅ VISIBILITÉ INITIALE basée sur la zone
    const isMyPlayer = sessionId === this.mySessionId || sessionId === this._pendingSessionId;
    if (isMyPlayer) {
      player.setVisible(true);
      player.setActive(true);
      this.createLocalPlayerIndicator(player);
    } else {
      // ✅ Pour les autres joueurs, vérifier s'ils doivent être visibles
      const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
      player.setVisible(shouldBeVisible);
      player.setActive(shouldBeVisible);
      
      console.log(`[PlayerManager] 👀 Joueur ${sessionId} créé avec visibilité: ${shouldBeVisible}`);
    }

    this.players.set(sessionId, player);
    console.log(`[PlayerManager] ✅ Joueur créé: ${sessionId} (total: ${this.players.size})`);
    
    return player;
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour d'un joueur existant
  updateExistingPlayer(player, x, y) {
    player.x = x;
    player.y = y;
    player.targetX = x;
    player.targetY = y;
    
    // ✅ VÉRIFIER LA VISIBILITÉ SELON LA ZONE ACTUELLE
    const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, player.sessionId);
    
    if (shouldBeVisible && !player.visible) {
      console.log("[PlayerManager] 🔧 Restauration visibilité joueur existant");
      player.setVisible(true);
      player.setActive(true);
    } else if (!shouldBeVisible && player.visible) {
      console.log("[PlayerManager] 👻 Masquage joueur hors zone");
      player.setVisible(false);
      player.setActive(false);
    }
    
    // Vérifier l'indicateur pour le joueur local
    if ((player.sessionId === this.mySessionId || player.sessionId === this._pendingSessionId) && !player.indicator) {
      this.createLocalPlayerIndicator(player);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Création de joueur placeholder
  createPlaceholderPlayer(sessionId, x, y) {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xff0000);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player_placeholder', 32, 32);
    graphics.destroy();
    
    const player = this.scene.add.sprite(x, y, 'player_placeholder').setOrigin(0.5, 1).setScale(1);
    player.setDepth(5);
    player.sessionId = sessionId;
    player.targetX = x;
    player.targetY = y;
    
    // ✅ Visibilité selon zone
    const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
    player.setVisible(shouldBeVisible);
    player.setActive(shouldBeVisible);
    
    this.players.set(sessionId, player);
    console.log("[PlayerManager] Placeholder créé pour", sessionId);
    return player;
  }

  // ✅ NOUVELLE MÉTHODE: Création optimisée de l'indicateur local
  createLocalPlayerIndicator(player) {
    // Nettoyer l'ancien indicateur
    if (player.indicator) {
      try { player.indicator.destroy(); } catch(e) {}
    }
    
    // Nettoyer tous les anciens indicateurs verts (sécurité)
    this.scene.children.list
      .filter(obj => obj && obj.type === "Arc" && obj.fillColor === 0x00ff00)
      .forEach(obj => { try { obj.destroy(); } catch(e) {} });
    
    // Créer le nouvel indicateur
    const indicator = this.scene.add.circle(player.x, player.y - 24, 3, 0x00ff00)
      .setDepth(1001)
      .setStrokeStyle(1, 0x004400);
    
    player.indicator = indicator;
    indicator.setVisible(true);
    
    console.log("[PlayerManager] ✅ Indicateur local créé pour", player.sessionId);
  }

  updatePlayers(state) {
    if (this.isDestroyed || !state || !state.players) {
      return;
    }
    
    if (!this.scene || !this.scene.scene.isActive()) {
      console.warn("[PlayerManager] updatePlayers: SCENE INACTIVE");
      return;
    }
    
    // ✅ AMÉLIORATION 5: Synchronisation sessionId améliorée
    this.synchronizeSessionId();
    
    this._lastStateUpdate = Date.now();
    this.performUpdate(state);
    
    // ✅ NOUVEAU: Après chaque update, vérifier la visibilité si on a une zone confirmée
    if (this._zoneConfirmed && this.currentZone) {
      this.ensurePlayersVisibilityCorrect();
    }
  }

  // ✅ NOUVELLE MÉTHODE: S'assurer que la visibilité est correcte
  ensurePlayersVisibilityCorrect() {
    // Throttle cette vérification
    if (!this._lastVisibilityCheck || (Date.now() - this._lastVisibilityCheck) > 1000) {
      this._lastVisibilityCheck = Date.now();
      
      let correctionsMade = false;
      
      this.players.forEach((player, sessionId) => {
        const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
        
        if (shouldBeVisible !== player.visible) {
          player.setVisible(shouldBeVisible);
          player.setActive(shouldBeVisible);
          correctionsMade = true;
          
          console.log(`[PlayerManager] 🔧 Correction visibilité ${sessionId}: ${shouldBeVisible}`);
        }
      });
      
      if (correctionsMade) {
        console.log(`[PlayerManager] ✅ Corrections de visibilité appliquées`);
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Synchronisation intelligente du sessionId
  synchronizeSessionId() {
    if (!this.scene.networkManager) return;
    
    const currentNetworkSessionId = this.scene.networkManager.getSessionId();
    
    // Si on a un sessionId en attente, l'activer maintenant
    if (this._pendingSessionId && this._pendingSessionId === currentNetworkSessionId) {
      console.log(`[PlayerManager] ✅ Activation sessionId en attente: ${this._pendingSessionId}`);
      this.mySessionId = this._pendingSessionId;
      this._pendingSessionId = null;
      this._isResynchronizing = false;
      return;
    }
    
    // Vérifier la désynchronisation normale
    if (this.mySessionId !== currentNetworkSessionId) {
      console.warn(`[PlayerManager] ⚠️ SessionId désynchronisé:`, {
        mySessionId: this.mySessionId,
        networkSessionId: currentNetworkSessionId,
        pending: this._pendingSessionId
      });
      
      if (!this._isResynchronizing) {
        this._isResynchronizing = true;
        this.setMySessionId(currentNetworkSessionId);
      }
    }
  }

  performUpdate(state) {
    if (this.isDestroyed || !this.scene?.scene?.isActive()) {
      return;
    }

    // Supprimer les joueurs déconnectés
    const currentSessionIds = new Set(state.players.keys());
    const playersToRemove = Array.from(this.players.keys()).filter(sessionId => 
      !currentSessionIds.has(sessionId)
    );
    
    playersToRemove.forEach(sessionId => {
      console.log("[PlayerManager] 🗑️ Suppression joueur déconnecté:", sessionId);
      this.removePlayer(sessionId);
    });

    // Mettre à jour ou créer les joueurs
    state.players.forEach((playerState, sessionId) => {
      this.updateOrCreatePlayer(sessionId, playerState);
    });

    // ✅ AMÉLIORATION 6: Notification joueur local prêt avec vérifications multiples
    this.checkMyPlayerReady();
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour ou création de joueur
  updateOrCreatePlayer(sessionId, playerState) {
    let player = this.players.get(sessionId);
    
    if (!player) {
      // ✅ CRÉER NOUVEAU JOUEUR avec visibilité basée sur la zone
      player = this.createPlayer(sessionId, playerState.x, playerState.y);
      if (!player) return;
    } else {
      // Vérifier que le joueur est toujours valide
      if (!player.scene || player.scene !== this.scene) {
        console.warn(`[PlayerManager] 🔧 Recréation joueur invalide: ${sessionId}`);
        this.players.delete(sessionId);
        player = this.createPlayer(sessionId, playerState.x, playerState.y);
        if (!player) return;
      }
    }

    // Mettre à jour les données du joueur
    this.updatePlayerFromState(player, playerState, sessionId);
  }

  // ✅ MÉTHODE MODIFIÉE: Mise à jour des données du joueur depuis le state
  updatePlayerFromState(player, playerState, sessionId) {
    // Position cible
    player.targetX = playerState.x;
    player.targetY = playerState.y;

    // États du mouvement
    if (playerState.isMoving !== undefined) player.isMoving = playerState.isMoving;
    if (playerState.direction) player.lastDirection = playerState.direction;

    // ✅ VÉRIFIER VISIBILITÉ SELON LA ZONE
    const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
    
    if (shouldBeVisible && !player.visible) {
      console.log(`[PlayerManager] 🔧 Restauration visibilité: ${sessionId}`);
      player.setVisible(true);
      player.setActive(true);
    } else if (!shouldBeVisible && player.visible && sessionId !== this.mySessionId && sessionId !== this._pendingSessionId) {
      console.log(`[PlayerManager] 👻 Masquage joueur hors zone: ${sessionId}`);
      player.setVisible(false);
      player.setActive(false);
    }

    // Animations seulement si visible
    if (player.visible) {
      this.updatePlayerAnimation(player);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour des animations
  updatePlayerAnimation(player) {
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
  }

  // ✅ NOUVELLE MÉTHODE: Vérification du joueur local prêt
  checkMyPlayerReady() {
    const effectiveSessionId = this._pendingSessionId || this.mySessionId;
    
    if (effectiveSessionId && this.players.has(effectiveSessionId) && !this._myPlayerIsReady) {
      this._myPlayerIsReady = true;
      console.log(`[PlayerManager] ✅ Mon joueur est prêt avec sessionId: ${effectiveSessionId}`);

      if (this._myPlayerReadyCallback) {
        console.log("[PlayerManager] 🎯 Callback onMyPlayerReady déclenché!");
        this._myPlayerReadyCallback(this.players.get(effectiveSessionId));
      }
    }
  }

  // ⭐️ update = lerp + SYNC INDICATOR à chaque frame !
  update(delta = 16) {
    for (const [sessionId, player] of this.players) {
      if (!player || !player.scene) continue;

      // ✅ AMÉLIORATION 7: L'indicateur suit toujours le joueur
      if (player.indicator) {
        player.indicator.x = player.x;
        player.indicator.y = player.y - 24;
      }

      // Interpolation de position seulement si visible
      if (player.visible) {
        this.updatePlayerPosition(player, sessionId, delta);
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour de la position du joueur
  updatePlayerPosition(player, sessionId, delta) {
    const isMyPlayer = (sessionId === this.mySessionId || sessionId === this._pendingSessionId);
    
    if (!isMyPlayer) {
      // Autres joueurs : lerp normal
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

  snapMyPlayerTo(x, y) {
    const player = this.getMyPlayer();
    if (!player) {
      console.warn("[PlayerManager] snapMyPlayerTo: Aucun joueur local");
      return;
    }
    
    console.log("[PlayerManager] snapMyPlayerTo", { x, y, oldX: player.x, oldY: player.y });

    player.targetX = x;
    player.targetY = y;
    player.snapLerpTimer = 0.20;

    // Snap forcé si trop loin
    if (Math.abs(player.x - x) > 64 || Math.abs(player.y - y) > 64) {
      console.log("[PlayerManager] Snap forcé (rollback > 64px)");
      player.x = x;
      player.y = y;
      player.snapLerpTimer = 0;
    }
  }

  removePlayer(sessionId) {
    if (this.isDestroyed) return;
    
    const player = this.players.get(sessionId);
    if (player) {
      console.log(`[PlayerManager] 🗑️ Suppression joueur: ${sessionId}`);
      
      if (player.anims && player.anims.isPlaying) player.anims.stop();
      if (player.indicator) { try { player.indicator.destroy(); } catch (e) {} }
      if (player.body && player.body.destroy) { try { player.body.destroy(); } catch (e) {} }
      try { player.destroy(); } catch (e) {}
      
      this.players.delete(sessionId);
    }
  }

  clearAllPlayers() {
    if (this.isDestroyed) return;
    
    console.log("[PlayerManager] 🧹 Nettoyage de tous les joueurs");
    
    const savedSessionId = this.mySessionId;
    const savedPendingSessionId = this._pendingSessionId;
    const savedZone = this.currentZone;
    const savedZoneConfirmed = this._zoneConfirmed;
    
    Array.from(this.players.keys()).forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    
    // Restaurer les IDs de session et zone
    this.mySessionId = savedSessionId;
    this._pendingSessionId = savedPendingSessionId;
    this.currentZone = savedZone;
    this._zoneConfirmed = savedZoneConfirmed;
    this._myPlayerIsReady = false;
    this._isResynchronizing = false;
    
    console.log(`[PlayerManager] ✅ Nettoyage terminé, données conservées: sessionId=${this.mySessionId}, zone=${this.currentZone}`);
  }

  // ✅ NOUVELLE MÉTHODE: Forcer la resynchronisation
  forceResynchronization() {
    console.log("[PlayerManager] 🔄 Forcer la resynchronisation...");
    
    this._isResynchronizing = false;
    this._myPlayerIsReady = false;
    this._hasWarnedMissingPlayer = false;
    
    if (this.scene.networkManager) {
      const networkSessionId = this.scene.networkManager.getSessionId();
      if (this.mySessionId !== networkSessionId) {
        console.log(`[PlayerManager] 🔄 Correction sessionId: ${this.mySessionId} → ${networkSessionId}`);
        this.setMySessionId(networkSessionId);
      }
      
      // ✅ SYNCHRONISER LA ZONE AVEC LE NETWORKMANAGER
      const networkZone = this.scene.networkManager.getCurrentZone();
      if (networkZone && networkZone !== this.currentZone) {
        console.log(`[PlayerManager] 🔄 Correction zone: ${this.currentZone} → ${networkZone}`);
        this.setCurrentZone(networkZone);
      }
    }
    
    this.debugPlayerState();
    
    // ✅ FORCER UN REFRESH DE VISIBILITÉ APRÈS RESYNC
    this.time.delayedCall(200, () => {
      this.refreshPlayersVisibility();
    });
  }

  // Méthodes existantes conservées
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

  logPlayers() {
    const playerList = Array.from(this.players.keys());
    if (playerList.length > 0 && this.mySessionId && !playerList.includes(this.mySessionId)) {
      console.warn(`[PlayerManager] ⚠️ Mon sessionId ${this.mySessionId} n'est pas dans la liste!`);
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
        isMyPlayer: sessionId === this.mySessionId || sessionId === this._pendingSessionId,
        direction: player.lastDirection,
        isMoving: player.isMoving,
        visible: player.visible,
        zone: this.currentZone
      };
    }
    return null;
  }

  checkPlayerState() {
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) return false;
    
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
    
    // Vérifier immédiatement si le joueur est déjà prêt
    const effectiveSessionId = this._pendingSessionId || this.mySessionId;
    if (effectiveSessionId && this.players.has(effectiveSessionId) && !this._myPlayerIsReady) {
      this._myPlayerIsReady = true;
      callback(this.players.get(effectiveSessionId));
    }
  }

  // ✅ NOUVELLES MÉTHODES UTILITAIRES POUR LA ZONE

  getCurrentZone() {
    return this.currentZone;
  }

  isZoneConfirmed() {
    return this._zoneConfirmed;
  }

  // ✅ NOUVELLE MÉTHODE: Forcer l'affichage de tous les joueurs (debug)
  forceShowAllPlayers() {
    console.log("[PlayerManager] 🔧 FORCE: Affichage de tous les joueurs");
    
    this.players.forEach((player, sessionId) => {
      if (!player.visible) {
        player.setVisible(true);
        player.setActive(true);
        console.log(`[PlayerManager] 👀 Joueur ${sessionId} forcé visible`);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Masquer les joueurs hors zone (debug)
  hidePlayersOutsideZone() {
    console.log("[PlayerManager] 👻 FORCE: Masquage joueurs hors zone");
    
    this.players.forEach((player, sessionId) => {
      const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
      
      if (!shouldBeVisible && player.visible) {
        player.setVisible(false);
        player.setActive(false);
        console.log(`[PlayerManager] 👻 Joueur ${sessionId} forcé masqué`);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Debug de la visibilité
  debugVisibility() {
    console.log(`[PlayerManager] 🔍 === DEBUG VISIBILITÉ ===`);
    console.log(`Zone actuelle: ${this.currentZone}`);
    console.log(`Zone confirmée: ${this._zoneConfirmed}`);
    
    this.players.forEach((player, sessionId) => {
      const isMyPlayer = sessionId === this.mySessionId || sessionId === this._pendingSessionId;
      const shouldBeVisible = this.shouldPlayerBeVisibleInCurrentZone(player, sessionId);
      
      console.log(`Joueur ${sessionId}${isMyPlayer ? ' (MOI)' : ''}:`, {
        visible: player.visible,
        shouldBeVisible: shouldBeVisible,
        correct: player.visible === shouldBeVisible
      });
      
      // Obtenir la zone du joueur depuis le serveur
      if (this.scene.networkManager?.room?.state?.players) {
        const playerState = this.scene.networkManager.room.state.players.get(sessionId);
        if (playerState) {
          console.log(`  Zone serveur: ${playerState.currentZone}`);
        }
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Statistiques de zone
  getZoneStats() {
    const stats = {
      currentZone: this.currentZone,
      confirmed: this._zoneConfirmed,
      totalPlayers: this.players.size,
      visiblePlayers: 0,
      hiddenPlayers: 0,
      myPlayer: null,
      playersByZone: {}
    };
    
    this.players.forEach((player, sessionId) => {
      const isMyPlayer = sessionId === this.mySessionId || sessionId === this._pendingSessionId;
      
      if (player.visible) {
        stats.visiblePlayers++;
      } else {
        stats.hiddenPlayers++;
      }
      
      if (isMyPlayer) {
        stats.myPlayer = sessionId;
      }
      
      // Obtenir la zone du joueur
      if (this.scene.networkManager?.room?.state?.players) {
        const playerState = this.scene.networkManager.room.state.players.get(sessionId);
        if (playerState && playerState.currentZone) {
          const zone = playerState.currentZone;
          if (!stats.playersByZone[zone]) {
            stats.playersByZone[zone] = [];
          }
          stats.playersByZone[zone].push(sessionId);
        }
      }
    });
    
    return stats;
  }

  destroy() {
    this.isDestroyed = true;
    console.warn("[PlayerManager] destroy() appelé");
    this.clearAllPlayers();
  }
}
