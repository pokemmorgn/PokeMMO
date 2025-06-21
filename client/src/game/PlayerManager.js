// PlayerManager.js - VERSION COMPLÈTE CORRIGÉE

export class PlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
    this.mySessionId = null;
    this.myPlayerReadyCallback = null;
  }

  setMySessionId(sessionId) {
    console.log(`[PlayerManager] 🆔 Mon sessionId défini: ${sessionId}`);
    this.mySessionId = sessionId;
    
    // Vérifier si mon joueur existe déjà
    const existingPlayer = this.players.get(sessionId);
    if (existingPlayer) {
      console.log(`[PlayerManager] ✅ Mon joueur trouvé rétroactivement: ${sessionId}`);
      this.setupMyPlayer(existingPlayer);
    }
  }

  // ✅ MÉTHODE CORRIGÉE: updatePlayers
  updatePlayers(state) {
    if (!state || !state.players) {
      console.warn('[PlayerManager] State invalide reçu:', state);
      return;
    }

    console.log(`[PlayerManager] 📊 Mise à jour des joueurs`);

    // ✅ CORRECTION: Gérer à la fois Map et Object
    let playersToProcess;
    
    if (state.players instanceof Map) {
      // État normal avec Map
      playersToProcess = Array.from(state.players.entries());
      console.log(`[PlayerManager] État Map avec ${state.players.size} joueurs`);
    } else if (typeof state.players === 'object' && state.players !== null) {
      // État filtré avec objet
      playersToProcess = Object.entries(state.players);
      console.log(`[PlayerManager] État filtré avec ${playersToProcess.length} joueurs`);
    } else {
      console.warn('[PlayerManager] Type de players non supporté:', typeof state.players);
      return;
    }

    // ✅ Traitement unifié avec le bon format
    playersToProcess.forEach(([sessionId, playerData]) => {
      // ✅ IMPORTANT: Passer directement playerData, pas state.players
      this.performUpdate(sessionId, playerData);
    });
  }

  // ✅ MÉTHODE CORRIGÉE: performUpdate
  performUpdate(sessionId, playerData) {
    // ✅ CORRECTION: playerData est maintenant directement l'objet joueur
    if (!playerData) {
      console.warn(`[PlayerManager] PlayerData manquant pour ${sessionId}`);
      return;
    }

    console.log(`[PlayerManager] 🔄 Update joueur ${sessionId}:`, {
      x: playerData.x,
      y: playerData.y,
      zone: playerData.currentZone
    });

    const isMyPlayer = sessionId === this.mySessionId;
    let player = this.players.get(sessionId);

    if (!player) {
      // ✅ Créer nouveau joueur avec playerData directement
      player = this.createPlayer(sessionId, playerData.x, playerData.y);
      if (!player) {
        console.error(`[PlayerManager] ❌ Échec création joueur ${sessionId}`);
        return;
      }

      // ✅ Appliquer les propriétés du joueur
      if (playerData.name) player.name = playerData.name;
      if (playerData.currentZone) player.currentZone = playerData.currentZone;
      
      console.log(`[PlayerManager] 🆕 Nouveau joueur créé: ${sessionId}`);
      
      if (isMyPlayer) {
        this.setupMyPlayer(player);
      }
    } else {
      // ✅ Mettre à jour joueur existant avec playerData directement
      this.updateExistingPlayer(player, playerData, isMyPlayer);
    }
  }

  // ✅ MÉTHODE CORRIGÉE: updateExistingPlayer
  updateExistingPlayer(player, playerData, isMyPlayer) {
    // ✅ Mise à jour normale avec l'objet playerData directement
    const newX = playerData.x;
    const newY = playerData.y;
    const newDirection = playerData.direction || 'down';
    const isMoving = playerData.isMoving || false;

    // Détecter les changements de position
    const positionChanged = Math.abs(player.x - newX) > 1 || Math.abs(player.y - newY) > 1;
    
    if (positionChanged && !isMyPlayer) {
      console.log(`[PlayerManager] 📍 ${player.name || player.sessionId}: (${player.x}, ${player.y}) → (${newX}, ${newY})`);
      
      // Interpolation fluide pour les autres joueurs
      this.scene.tweens.add({
        targets: player,
        x: newX,
        y: newY,
        duration: 150,
        ease: 'Linear'
      });
      
      if (player.indicator) {
        this.scene.tweens.add({
          targets: player.indicator,
          x: newX,
          y: newY - 24,
          duration: 150,
          ease: 'Linear'
        });
      }
    } else if (isMyPlayer) {
      // ✅ Pour mon joueur: position serveur fait autorité seulement si très différente
      const significantChange = Math.abs(player.x - newX) > 32 || Math.abs(player.y - newY) > 32;
      
      if (significantChange) {
        console.log(`[PlayerManager] 🔧 Correction position majeure: (${player.x}, ${player.y}) → (${newX}, ${newY})`);
        player.x = newX;
        player.y = newY;
        player.targetX = newX;
        player.targetY = newY;
        
        if (player.indicator) {
          player.indicator.x = newX;
          player.indicator.y = newY - 24;
        }
      }
    }

    // Mettre à jour les propriétés
    if (playerData.name && player.name !== playerData.name) {
      player.name = playerData.name;
      this.updatePlayerLabel(player);
    }

    // Animations
    if (isMoving && !isMyPlayer) {
      const animKey = `walk_${newDirection}`;
      if (player.anims.exists(animKey)) {
        player.play(animKey, true);
      }
    } else if (!isMoving && !isMyPlayer) {
      const idleKey = `idle_${newDirection}`;
      if (player.anims.exists(idleKey)) {
        player.play(idleKey, true);
      }
    }
  }

  createPlayer(sessionId, x, y) {
    console.log(`[PlayerManager] 🆕 Création nouveau joueur: ${sessionId} à (${x}, ${y})`);

    if (!this.scene.textures.exists('dude')) {
      console.error(`[PlayerManager] ❌ Texture 'dude' non trouvée`);
      return null;
    }

    // Créer les animations si nécessaire
    this.createPlayerAnimations();

    const player = this.scene.physics.add.sprite(x, y, 'dude');
    player.sessionId = sessionId;
    player.targetX = x;
    player.targetY = y;
    player.setDepth(5);
    player.name = sessionId;
    player.currentZone = null;
    player.isMovingLocally = false;

    // Créer l'indicateur local (toujours visible)
    this.createLocalIndicator(player);

    this.players.set(sessionId, player);
    console.log(`[PlayerManager] ✅ Joueur créé: ${sessionId} (total: ${this.players.size})`);

    return player;
  }

  createPlayerAnimations() {
    if (this.scene.anims.exists('walk_left')) return;

    console.log('[PlayerManager] Création des animations BoyWalk');

    this.scene.anims.create({
      key: 'walk_left',
      frames: this.scene.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'idle_left',
      frames: [{ key: 'dude', frame: 4 }],
      frameRate: 1
    });

    this.scene.anims.create({
      key: 'walk_right',
      frames: this.scene.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'idle_right',
      frames: [{ key: 'dude', frame: 5 }],
      frameRate: 1
    });

    this.scene.anims.create({
      key: 'walk_up',
      frames: this.scene.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'idle_up',
      frames: [{ key: 'dude', frame: 4 }],
      frameRate: 1
    });

    this.scene.anims.create({
      key: 'walk_down',
      frames: this.scene.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'idle_down',
      frames: [{ key: 'dude', frame: 5 }],
      frameRate: 1
    });
  }

  createLocalIndicator(player) {
    const indicator = this.scene.add.circle(
      player.x, 
      player.y - 24, 
      8, 
      0x00ff00, 
      0.8
    );
    
    indicator.setDepth(10);
    indicator.setVisible(true);
    
    player.indicator = indicator;
    console.log(`[PlayerManager] ✅ Indicateur local créé pour ${player.sessionId}`);
  }

  setupMyPlayer(player) {
    console.log(`[PlayerManager] ✅ Mon joueur est prêt avec sessionId: ${player.sessionId}`);
    
    if (this.myPlayerReadyCallback) {
      console.log(`[PlayerManager] 🎯 Callback onMyPlayerReady déclenché!`);
      this.myPlayerReadyCallback(player);
    }
  }

  onMyPlayerReady(callback) {
    this.myPlayerReadyCallback = callback;
  }

  getMyPlayer() {
    if (!this.mySessionId) return null;
    return this.players.get(this.mySessionId);
  }

  snapMyPlayerTo(x, y) {
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) return;

    console.log(`[PlayerManager] 📍 Snap mon joueur vers: (${x}, ${y})`);
    myPlayer.x = x;
    myPlayer.y = y;
    myPlayer.targetX = x;
    myPlayer.targetY = y;

    if (myPlayer.indicator) {
      myPlayer.indicator.x = x;
      myPlayer.indicator.y = y - 24;
    }
  }

  updatePlayerLabel(player) {
    // Logique pour mettre à jour le label du joueur si nécessaire
  }

  forceResynchronization() {
    console.log(`[PlayerManager] 🔄 Force resynchronisation...`);
    // Logique de resynchronisation si nécessaire
  }

  clearAllPlayers() {
    console.log(`[PlayerManager] 🧹 Nettoyage de tous les joueurs...`);
    
    this.players.forEach((player) => {
      if (player.indicator) {
        player.indicator.destroy();
      }
      player.destroy();
    });
    
    this.players.clear();
    this.mySessionId = null;
    this.myPlayerReadyCallback = null;
  }

  update() {
    // Logique d'update si nécessaire
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getPlayerCount() {
    return this.players.size;
  }
}
