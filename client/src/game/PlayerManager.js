// src/game/PlayerManager.js - VERSION CORRIGÉE POUR WORLDROOM
// ✅ Corrections pour la synchronisation et les transitions de zones
import { CharacterManager } from './CharacterManager.js';

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
    this.characterManager = new CharacterManager(scene);

    
    // ✅ NOUVEAU: Système de synchronisation amélioré
    this._pendingSessionId = null;
    this._isResynchronizing = false;
    this._lastStateUpdate = 0;
    
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
        indicator: oldPlayer.indicator,
        characterId: oldPlayer.characterId

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
    
    // Nettoyer les autres joueurs obsolètes (de l'ancienne room)
    const playersToClean = Array.from(this.players.keys()).filter(id => 
      id !== newSessionId && id !== oldSessionId
    );
    
    if (playersToClean.length > 0) {
      console.log(`[PlayerManager] 🗑️ Nettoyage de ${playersToClean.length} joueurs obsolètes`);
      playersToClean.forEach(id => this.removePlayer(id));
    }
    
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
    
    if (this.scene.networkManager) {
      console.log("- networkManager.sessionId:", this.scene.networkManager.getSessionId());
      console.log("- networkManager.isConnected:", this.scene.networkManager.isConnected);
      console.log("- networkManager.currentZone:", this.scene.networkManager.getCurrentZone());
    }
    
    this.players.forEach((player, sessionId) => {
      console.log(`- Joueur ${sessionId}:`, {
        x: player.x,
        y: player.y,
        visible: player.visible,
        active: player.active,
        hasIndicator: !!player.indicator,
        sessionIdMatch: sessionId === this.mySessionId
      });
    });
  }

async createPlayer(sessionId, x, y, characterId = 'brendan') {
  if (this.isDestroyed) {
    console.error("[PlayerManager] createPlayer appelé alors que destroy déjà fait!");
    return null;
  }

  // ✅ CORRECTION: Vérifier sessionId valide
  if (!sessionId || sessionId === 'null' || sessionId === null) {
    console.error("[PlayerManager] SessionId invalide pour createPlayer:", sessionId);
    return null;
  }

  // ✅ CORRECTION CRITIQUE: Vérifier si le joueur existe déjà AVANT de créer
  if (this.players.has(sessionId)) {
    console.log(`[PlayerManager] ⚠️ Joueur ${sessionId} existe déjà, pas de création`);
    const existingPlayer = this.players.get(sessionId);
    this.updateExistingPlayer(existingPlayer, x, y);
    return existingPlayer;
  }

  console.log(`[PlayerManager] 🆕 Création nouveau joueur: ${sessionId} à (${x}, ${y}) avec personnage ${characterId}`);

  // ✅ UTILISER EXCLUSIVEMENT CharacterManager
  const player = await this.characterManager.createCharacterSprite(characterId, x, y);
  if (!player) {
    console.error(`[PlayerManager] Impossible de créer le sprite pour ${sessionId}`);
    return null;
  }

  // ✅ CORRECTION: Vérifier que le sprite est valide avant configuration
  if (!player || typeof player.setVisible !== 'function') {
    console.error(`[PlayerManager] Sprite invalide créé pour ${sessionId}`);
    return null;
  }

  // Configuration du joueur
  player.sessionId = sessionId;
  player.targetX = x;
  player.targetY = y;
  player.snapLerpTimer = 0;
  player.lastDirection = 'down';
  player.isMoving = false;
  player.setVisible(true);
  player.setActive(true);

  // Jouer l'animation idle par défaut via CharacterManager
  this.characterManager.playAnimation(player, 'idle', 'down');

  // Indicateur local optimisé
  if (sessionId === this.mySessionId || sessionId === this._pendingSessionId) {
    this.createLocalPlayerIndicator(player);
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
    
    // Restaurer la visibilité si nécessaire
if (player && typeof player.setVisible === 'function' && !player.visible) {
  console.log("[PlayerManager] 🔧 Restauration visibilité joueur existant");
  player.setVisible(true);
  player.setActive(true);
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
    
    // ✅ CORRECTION CRITIQUE: Ne plus bloquer pendant les transitions
    // Le joueur doit pouvoir apparaître même pendant une transition
    if (this.scene.networkManager && this.scene.networkManager.isTransitionActive) {
      console.log("[PlayerManager] updatePlayers: Transition en cours, mais traitement autorisé");
      // On continue quand même pour permettre l'apparition du joueur
    }

    // ✅ AMÉLIORATION 5: Synchronisation sessionId améliorée
    this.synchronizeSessionId();
    
    this._lastStateUpdate = Date.now();
    this.performUpdate(state);
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
  // ✅ CORRECTION: Vérifier sessionId valide
  if (!sessionId || sessionId === 'null' || sessionId === null) {
    console.warn(`[PlayerManager] SessionId invalide dans updateOrCreatePlayer:`, sessionId);
    return;
  }

  // ✅ FILTRE PAR ZONE AMÉLIORÉ
  const shouldShowPlayer = this.shouldDisplayPlayer(sessionId, playerState);
  
  let player = this.players.get(sessionId);
  
  if (!shouldShowPlayer) {
    if (player && sessionId !== this.mySessionId && sessionId !== this._pendingSessionId) {
      console.log(`[PlayerManager] 👻 Masquage joueur hors zone: ${sessionId}`);
      this.removePlayer(sessionId);
    }
    return;
  }

  if (!player) {
    // ✅ CORRECTION: Attendre la création avant de continuer
    this.createPlayer(sessionId, playerState.x, playerState.y).then(createdPlayer => {
      if (createdPlayer) {
        this.updatePlayerFromState(createdPlayer, playerState);
      }
    });
    return;
  } else {
    // Vérifier que le joueur est toujours valide
    if (!player.scene || player.scene !== this.scene) {
      console.warn(`[PlayerManager] 🔧 Recréation joueur invalide: ${sessionId}`);
      this.players.delete(sessionId);
      this.createPlayer(sessionId, playerState.x, playerState.y).then(createdPlayer => {
        if (createdPlayer) {
          this.updatePlayerFromState(createdPlayer, playerState);
        }
      });
      return;
    }
  }

  // Mettre à jour les données du joueur
  this.updatePlayerFromState(player, playerState);
}

  // ✅ NOUVELLE MÉTHODE: Déterminer si un joueur doit être affiché
  shouldDisplayPlayer(sessionId, playerState) {
    // Toujours afficher notre propre joueur
    if (sessionId === this.mySessionId || sessionId === this._pendingSessionId) {
      return true;
    }
    
    // Pour les autres joueurs, vérifier la zone
    if (playerState.currentZone && this.scene.zoneName) {
      return playerState.currentZone === this.scene.zoneName;
    }

    if (playerState.currentZone && this.scene.zoneName) {
  if (sessionId !== this.mySessionId && playerState.currentZone !== this.scene.zoneName) {
    console.log(`[PlayerManager] Joueur ${sessionId} masqué, zone différente (${playerState.currentZone} ≠ ${this.scene.zoneName})`);
    return false;
  }
}
    // Si pas d'info de zone, afficher par défaut
    return true;
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour des données du joueur depuis le state
  updatePlayerFromState(player, playerState) {
    // Position cible
    player.targetX = playerState.x;
    player.targetY = playerState.y;

    // États du mouvement
    if (playerState.isMoving !== undefined) player.isMoving = playerState.isMoving;
    if (playerState.direction) player.lastDirection = playerState.direction;

     // 🔥 AJOUTE LA SYNC ICI :
    if (playerState.currentZone) player.currentZone = playerState.currentZone;

    // Restaurer la visibilité si nécessaire
    if (player && typeof player.setVisible === 'function' && !player.visible) {
      console.warn(`[PlayerManager] 🔧 Restauration visibilité: ${player.sessionId}`);
      player.setVisible(true);
      player.setActive(true);
    } else if (player && typeof player.setVisible !== 'function') {
      console.error(`[PlayerManager] ❌ Joueur ${player.sessionId || 'unknown'} n'a pas setVisible - type:`, typeof player);
    }

    // Animations
    this.updatePlayerAnimation(player);
  }

  // ✅ NOUVELLE MÉTHODE: Mise à jour des animations
  updatePlayerAnimation(player) {
    if (!this.characterManager) return;
    
    if (player.isMoving && player.lastDirection) {
      this.characterManager.playAnimation(player, 'walk', player.lastDirection);
    } else if (!player.isMoving && player.lastDirection) {
      this.characterManager.playAnimation(player, 'idle', player.lastDirection);
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vérification du joueur local prêt
  

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

      // Interpolation de position
      this.updatePlayerPosition(player, sessionId, delta);
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
    
    Array.from(this.players.keys()).forEach(sessionId => this.removePlayer(sessionId));
    this.players.clear();
    
    // Restaurer les IDs de session
    this.mySessionId = savedSessionId;
    this._pendingSessionId = savedPendingSessionId;
    this._myPlayerIsReady = false;
    this._isResynchronizing = false;
    
    console.log(`[PlayerManager] ✅ Nettoyage terminé, sessionId conservé: ${this.mySessionId}`);
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
    }
    
    this.debugPlayerState();
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
        isMoving: player.isMoving
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

  destroy() {
    this.isDestroyed = true;
      if (this.characterManager) {
      this.characterManager.destroy();
      this.characterManager = null;
    }
    console.warn("[PlayerManager] destroy() appelé");
    this.clearAllPlayers();
  }
}
