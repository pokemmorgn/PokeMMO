import { BaseZoneScene } from './BaseZoneScene.js';

export class Road1Scene extends BaseZoneScene {
  constructor() {
    super('Road1Scene', 'Road1');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log("[Road1Scene] Constructor appelé");
  }

  

  createTransitionZone(transitionObj, targetScene, direction) {
    console.log(`[Road1Scene] createTransitionZone vers ${targetScene}, direction ${direction}`);
    const transitionZone = this.add.zone(
      transitionObj.x + transitionObj.width / 2,
      transitionObj.y + transitionObj.height / 2,
      transitionObj.width,
      transitionObj.height
    );

    this.physics.world.enable(transitionZone);
    transitionZone.body.setAllowGravity(false);
    transitionZone.body.setImmovable(true);

    let overlapCreated = false;
    
    const checkPlayerInterval = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const myPlayer = this.playerManager.getMyPlayer();
        
        if (myPlayer && !overlapCreated) {
          console.log("[Road1Scene] Joueur trouvé, création overlap avec zone de transition");
          overlapCreated = true;
          
          this.physics.add.overlap(myPlayer, transitionZone, () => {
            console.log(`[Road1Scene] Overlap détecté avec zone vers ${targetScene}`);
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
              console.log("[Road1Scene] Transition en cooldown ou déjà en cours, on ignore");
              return;
            }

            this.transitionCooldowns[cooldownKey] = true;
            transitionZone.body.enable = false;

            this.networkManager.requestZoneTransition(targetScene, direction);

            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) {
                delete this.transitionCooldowns[cooldownKey];
                console.log(`[Road1Scene] Cooldown supprimé pour ${cooldownKey}`);
              }
              if (transitionZone.body) {
                transitionZone.body.enable = true;
              }
            });
          });
          
          checkPlayerInterval.remove();
        }
      },
    });
  }

  positionPlayer(player) {
    // Essaie de deviner la provenance pour ajuster le spawn
    let fromZone = "";
    if (this.networkManager && typeof this.networkManager.getLastZone === "function") {
      fromZone = this.networkManager.getLastZone();
    } else if (player.fromZone) {
      fromZone = player.fromZone;
    }

    if (fromZone === "LavandiaScene") {
      // Spawn via SpointPoint_Road1top
      const spawnObj = this.map.getObjectLayer('SpawnPoint')?.objects.find(obj => obj.name === 'SpointPoint_Road1top');
      if (spawnObj) {
        player.x = spawnObj.x + (spawnObj.width || 0) / 2;
        player.y = spawnObj.y + (spawnObj.height || 0) / 2;
        console.log(`[Road1Scene] positionné via SpointPoint_Road1top à (${player.x}, ${player.y})`);
      } else {
        player.x = 342;
        player.y = 618;
        console.warn("[Road1Scene] SpointPoint_Road1top non trouvé, position par défaut utilisée");
      }
    } else {
      player.x = 342;
      player.y = 618;
      console.log(`[Road1Scene] position forcée à (${player.x}, ${player.y})`);
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
      console.log("[Road1Scene] Indicateur joueur mis à jour");
    }

    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
      console.log("[Road1Scene] Position envoyée au serveur");
    }
  }

  create() {
    console.log("[Road1Scene] create appelé");
    super.create();
    this.setupRoad1UI();
    this.setupRoad1Events();
    this.ensurePlayerIsCreated();
  }

  ensurePlayerIsCreated() {
    const checkPlayer = () => {
      const myPlayer = this.playerManager?.getMyPlayer();
      
      if (myPlayer) {
        console.log("[Road1Scene] ✅ Joueur trouvé, on stop la vérification");
        return;
      }
      
      this.playerCreationAttempts++;
      console.log(`[Road1Scene] 🔄 Tentative ${this.playerCreationAttempts}/${this.maxPlayerCreationAttempts} - Joueur non trouvé`);

      if (this.playerCreationAttempts >= this.maxPlayerCreationAttempts) {
        console.error("[Road1Scene] ❌ Échec de création du joueur après plusieurs tentatives");
        if (this.networkManager) {
          console.log("[Road1Scene] 🔄 Tentative de reconnexion");
          this.networkManager.reconnect();
        }
        return;
      }

      if (this.networkManager && this.networkManager.getSessionId()) {
        const sessionId = this.networkManager.getSessionId();
        const playerState = this.networkManager.getPlayerState(sessionId);
        
        if (playerState) {
          console.log("[Road1Scene] 🔧 Données joueur existantes, création forcée");
          this.playerManager.createPlayer(sessionId, playerState);
          this.positionPlayer(this.playerManager.getMyPlayer());
        } else {
          console.log("[Road1Scene] 🔧 Création d'un état joueur par défaut");
          const defaultState = {
            x: 342,
            y: 618,
            sessionId: sessionId,
            name: sessionId.substring(0, 8)
          };
          this.playerManager.createPlayer(sessionId, defaultState);
          this.positionPlayer(this.playerManager.getMyPlayer());
        }
      }

      this.time.delayedCall(500, checkPlayer);
    };

    this.time.delayedCall(200, checkPlayer);
  }

  setupRoad1UI() {
    console.log("[Road1Scene] setupRoad1UI appelé");
    this.add
      .text(16, 80, 'Road 1 - Route vers l\'aventure', {
        font: '16px monospace',
        fill: '#ffffff',
        padding: { x: 10, y: 5 },
        backgroundColor: 'rgba(139, 69, 19, 0.8)',
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  setupRoad1Events() {
    this.time.delayedCall(1500, () => {
      console.log("[Road1Scene] Bienvenue sur la Route 1 !");
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nRoute 1\nConnected!');
      }
    });
  }

  cleanup() {
    console.log("[Road1Scene] cleanup appelé");
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    super.cleanup();
  }
}
