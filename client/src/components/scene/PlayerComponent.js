// client/src/components/scene/PlayerComponent.js
// ✅ Composant responsable de la gestion des joueurs

export class PlayerComponent {
  constructor(scene) {
    this.scene = scene;
    this.playerManager = null;
    this.myPlayerReady = false;
    this.lastDirection = 'down';
    this.lastMoveTime = 0;
    this.spawnGraceTime = 0;
    this.spawnGraceDuration = 2000;
    
    this.callbacks = {
      onPlayerReady: null,
      onPlayerPositioned: null
    };
  }

  // === INITIALISATION ===
  async initialize(mySessionId = null) {
    try {
      console.log(`👤 Initialisation PlayerComponent...`);
      
      // Importer et créer le PlayerManager
      const { PlayerManager } = await import('../../game/PlayerManager.js');
      this.playerManager = new PlayerManager(this.scene);
      
      if (mySessionId) {
        this.playerManager.setMySessionId(mySessionId);
      }
      
      // Setup du handler joueur prêt
      this.setupPlayerReadyHandler();
      
      console.log(`✅ PlayerComponent initialisé`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur initialisation PlayerComponent:`, error);
      return false;
    }
  }

  // === GESTION DES ÉVÉNEMENTS ===
  setupPlayerReadyHandler() {
    if (!this.playerManager) return;
    
    this.playerManager.onMyPlayerReady((myPlayer) => {
      if (!this.myPlayerReady) {
        this.myPlayerReady = true;
        console.log(`✅ Mon joueur est prêt:`, myPlayer.x, myPlayer.y);

        // Positionner le joueur
        this.positionPlayer(myPlayer);

        // Déclencher le callback
        if (this.callbacks.onPlayerReady) {
          this.callbacks.onPlayerReady(myPlayer);
        }
      }
    });
  }

  // === POSITION ET MOUVEMENT ===
  positionPlayer(player) {
    const initData = this.scene.scene.settings.data;
    
    console.log(`📍 Positionnement joueur...`);
    console.log(`📊 InitData:`, initData);
    
    if (initData?.spawnX !== undefined && initData?.spawnY !== undefined) {
      console.log(`📍 Position depuis transition: ${initData.spawnX}, ${initData.spawnY}`);
      player.x = initData.spawnX;
      player.y = initData.spawnY;
      player.targetX = initData.spawnX;
      player.targetY = initData.spawnY;
    } else {
      const defaultPos = this.getDefaultSpawnPosition(initData?.fromZone);
      console.log(`📍 Position par défaut: ${defaultPos.x}, ${defaultPos.y}`);
      player.x = defaultPos.x;
      player.y = defaultPos.y;
      player.targetX = defaultPos.x;
      player.targetY = defaultPos.y;
    }

    player.setVisible(true);
    player.setActive(true);
    player.setDepth(5);

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
      player.indicator.setVisible(true);
    }

    // Délai de grâce après spawn
    this.spawnGraceTime = Date.now() + this.spawnGraceDuration;
    console.log(`🛡️ Délai de grâce activé pour ${this.spawnGraceDuration}ms`);

    // Envoyer la position au serveur
    if (this.scene.networkComponent?.isNetworkReady()) {
      this.scene.networkComponent.sendMove(player.x, player.y, 'down', false);
    }

    // Callback de positionnement
    if (this.callbacks.onPlayerPositioned) {
      this.callbacks.onPlayerPositioned(player, initData);
    }
  }

  getDefaultSpawnPosition(fromZone) {
    // Position par défaut selon la scène
    const sceneKey = this.scene.scene.key;
    
    switch(sceneKey) {
      case 'BeachScene':
        if (fromZone === 'VillageScene') {
          return { x: 52, y: 48 };
        }
        return { x: 52, y: 48 };
        
      case 'VillageScene':
        switch(fromZone) {
          case 'BeachScene': return { x: 100, y: 200 };
          case 'Road1Scene': return { x: 300, y: 100 };
          case 'VillageLabScene': return { x: 150, y: 150 };
          default: return { x: 200, y: 200 };
        }
        
      case 'VillageLabScene':
        if (fromZone === 'VillageScene') {
          return { x: 200, y: 300 };
        }
        return { x: 200, y: 300 };
        
      default:
        return { x: 100, y: 100 };
    }
  }

  handleMovement() {
    // Bloquer le mouvement si nécessaire
    if (this.shouldBlockMovement()) {
      const myPlayer = this.getMyPlayer();
      if (myPlayer && myPlayer.body) {
        myPlayer.body.setVelocity(0, 0);
        myPlayer.play(`idle_${this.lastDirection}`, true);
        myPlayer.isMovingLocally = false;
      }
      return;
    }

    const speed = 120;
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) return;

    let vx = 0, vy = 0;
    let moved = false, direction = null;

    // Vérifier les inputs
    const cursors = this.scene.cursors;
    const wasd = this.scene.wasd;

    if (cursors?.left?.isDown || wasd?.A?.isDown) {
      vx = -speed; moved = true; direction = 'left';
    } else if (cursors?.right?.isDown || wasd?.D?.isDown) {
      vx = speed; moved = true; direction = 'right';
    }
    if (cursors?.up?.isDown || wasd?.W?.isDown) {
      vy = -speed; moved = true; direction = 'up';
    } else if (cursors?.down?.isDown || wasd?.S?.isDown) {
      vy = speed; moved = true; direction = 'down';
    }

    if (myPlayer.body) {
      myPlayer.body.setVelocity(vx, vy);
    }

    if (moved && direction) {
      myPlayer.play(`walk_${direction}`, true);
      this.lastDirection = direction;
      myPlayer.isMovingLocally = true;
      
      // Désactiver le délai de grâce dès que le joueur bouge
      if (this.spawnGraceTime > 0) {
        this.spawnGraceTime = 0;
        console.log(`🏃 Joueur bouge, délai de grâce désactivé`);
      }
    } else {
      myPlayer.play(`idle_${this.lastDirection}`, true);
      myPlayer.isMovingLocally = false;
    }

    if (moved) {
      const now = Date.now();
      if (!this.lastMoveTime || now - this.lastMoveTime > 50) {
        // Envoyer au serveur via NetworkComponent
        if (this.scene.networkComponent?.isNetworkReady()) {
          this.scene.networkComponent.sendMove(
            myPlayer.x, 
            myPlayer.y, 
            direction || this.lastDirection, 
            moved
          );
        }
        this.lastMoveTime = now;
      }
    }
  }

  shouldBlockMovement() {
    // Vérifier si le mouvement doit être bloqué
    return window.shouldBlockInput && window.shouldBlockInput();
  }

  // === GESTION DES ÉTATS ===
  updatePlayers(state) {
    if (this.playerManager) {
      this.playerManager.updatePlayers(state);
      
      // Vérifier si mon joueur est prêt
      this.checkMyPlayerFromState();
    }
  }

  checkMyPlayerFromState() {
    if (this.myPlayerReady) return;
    
    const myPlayer = this.getMyPlayer();
    if (myPlayer && !this.myPlayerReady) {
      this.myPlayerReady = true;
      console.log(`✅ Joueur local trouvé via state`);
      
      this.positionPlayer(myPlayer);
      
      if (this.callbacks.onPlayerReady) {
        this.callbacks.onPlayerReady(myPlayer);
      }
    }
  }

  update(delta) {
    if (this.playerManager) {
      this.playerManager.update(delta);
    }
  }

  // === UTILITAIRES ===
  setMySessionId(sessionId) {
    if (this.playerManager) {
      this.playerManager.setMySessionId(sessionId);
    }
  }

  createPlayer(sessionId, x, y) {
    if (this.playerManager) {
      return this.playerManager.createPlayer(sessionId, x, y);
    }
    return null;
  }

  snapMyPlayerTo(x, y) {
    if (this.playerManager) {
      this.playerManager.snapMyPlayerTo(x, y);
    }
  }

  forceResynchronization() {
    if (this.playerManager) {
      this.playerManager.forceResynchronization();
    }
  }

  checkPlayerState() {
    const myPlayer = this.getMyPlayer();
    if (!myPlayer) {
      console.warn(`Joueur manquant!`);
      return false;
    }
    
    let fixed = false;
    
    if (!myPlayer.visible) {
      console.warn(`Joueur invisible, restauration`);
      myPlayer.setVisible(true);
      fixed = true;
    }
    
    if (!myPlayer.active) {
      console.warn(`Joueur inactif, restauration`);
      myPlayer.setActive(true);
      fixed = true;
    }
    
    if (myPlayer.indicator && !myPlayer.indicator.visible) {
      console.warn(`Indicateur invisible, restauration`);
      myPlayer.indicator.setVisible(true);
      fixed = true;
    }
    
    if (fixed) {
      console.log(`État du joueur corrigé`);
    }
    
    return true;
  }

  // === CALLBACKS ===
  onPlayerReady(callback) { 
    this.callbacks.onPlayerReady = callback; 
    
    // Vérifier immédiatement si le joueur est déjà prêt
    const myPlayer = this.getMyPlayer();
    if (myPlayer && !this.myPlayerReady) {
      this.myPlayerReady = true;
      this.positionPlayer(myPlayer);
      callback(myPlayer);
    }
  }
  
  onPlayerPositioned(callback) { 
    this.callbacks.onPlayerPositioned = callback; 
  }

  // === GETTERS ===
  getMyPlayer() {
    return this.playerManager ? this.playerManager.getMyPlayer() : null;
  }

  getAllPlayers() {
    return this.playerManager ? this.playerManager.getAllPlayers() : [];
  }

  getPlayerCount() {
    return this.playerManager ? this.playerManager.getPlayerCount() : 0;
  }

  getPlayerInfo(sessionId) {
    return this.playerManager ? this.playerManager.getPlayerInfo(sessionId) : null;
  }

  isPlayerReady() {
    return this.myPlayerReady;
  }

  // === CLEANUP ===
  clearAllPlayers() {
    if (this.playerManager) {
      this.playerManager.clearAllPlayers();
    }
    this.myPlayerReady = false;
  }

  cleanup() {
    // Nettoyage conditionnel selon le type de fermeture
    const isTransition = this.scene.networkComponent?.networkManager?.isTransitionActive;
    
    if (!isTransition) {
      // Nettoyage complet seulement si ce n'est pas une transition
      this.clearAllPlayers();
    } else {
      // En transition, préserver les données critiques
      console.log(`🔄 Nettoyage léger pour transition`);
    }
    
    this.myPlayerReady = false;
  }

  destroy() {
    this.callbacks = {};
    if (this.playerManager) {
      this.playerManager.destroy();
    }
    this.playerManager = null;
    this.myPlayerReady = false;
  }
}
