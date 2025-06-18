import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaScene extends BaseZoneScene {
  constructor() {
    super('LavandiaScene', 'Lavandia');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log("[LavandiaScene] Constructor appelé");
  }

  setupZoneTransitions() {
    console.log("[LavandiaScene] setupZoneTransitions appelé");
    const worldsLayer = this.map.getObjectLayer('Worlds');
    if (worldsLayer) {
      console.log(`[LavandiaScene] Objects dans 'Worlds' : ${worldsLayer.objects.length}`);
      // Transition retour vers Road1
      const road1Exit = worldsLayer.objects.find(obj => obj.name === 'Road1');
      if (road1Exit) {
        this.createTransitionZone(road1Exit, 'Road1Scene', 'east');
      } else {
        console.warn("[LavandiaScene] Objet 'Road1' introuvable dans 'Worlds'");
      }
    } else {
      console.warn("[LavandiaScene] Calque d'objets 'Worlds' introuvable");
    }
  }
export class BaseZoneScene extends Phaser.Scene {
  // ... tout ton code ...

  createTransitionZone(transitionObj, targetScene, direction) {
    const sceneName = this.scene.key || 'BaseZoneScene';
    console.log(`[${sceneName}] createTransitionZone vers ${targetScene}, direction ${direction}`);

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
          console.log(`[${sceneName}] Joueur trouvé, création overlap avec zone de transition`);
          overlapCreated = true;
          this.physics.add.overlap(myPlayer, transitionZone, () => {
            console.log(`[${sceneName}] Overlap détecté avec zone vers ${targetScene}`);
            const cooldownKey = `${targetScene}_${direction}`;
            if (this.transitionCooldowns[cooldownKey] || this.isTransitioning) {
              console.log(`[${sceneName}] Transition en cooldown ou déjà en cours, on ignore`);
              return;
            }
            this.transitionCooldowns[cooldownKey] = true;
            transitionZone.body.enable = false;
            this.networkManager.requestZoneTransition(targetScene, direction);

            this.time.delayedCall(3000, () => {
              if (this.transitionCooldowns) {
                delete this.transitionCooldowns[cooldownKey];
                console.log(`[${sceneName}] Cooldown supprimé pour ${cooldownKey}`);
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
    // On récupère la position de SpawnPoint_Lavandiabottom dans la map
    const spawnObj = this.map.getObjectLayer('Worlds')?.objects.find(obj => obj.name === 'SpawnPoint_Lavandiabottom');
    if (spawnObj) {
      player.x = spawnObj.x + (spawnObj.width || 0) / 2;
      player.y = spawnObj.y + (spawnObj.height || 0) / 2;
      console.log(`[LavandiaScene] positionné via SpawnPoint_Lavandiabottom à (${player.x}, ${player.y})`);
    } else {
      // Fallback : coords par défaut si le spawnpoint n’existe pas
      player.x = 350;
      player.y = 750;
      console.warn("[LavandiaScene] SpawnPoint_Lavandiabottom non trouvé, position par défaut utilisée");
    }

    if (player.indicator) {
      player.indicator.x = player.x;
      player.indicator.y = player.y - 32;
    }
    if (this.networkManager) {
      this.networkManager.sendMove(player.x, player.y);
    }
  }

  create() {
    super.create();
    this.setupLavandiaUI();
    this.setupLavandiaEvents();
    this.ensurePlayerIsCreated();
  }

  ensurePlayerIsCreated() {
    const checkPlayer = () => {
      const myPlayer = this.playerManager?.getMyPlayer();
      if (myPlayer) return;

      this.playerCreationAttempts++;
      if (this.playerCreationAttempts >= this.maxPlayerCreationAttempts) {
        if (this.networkManager) this.networkManager.reconnect();
        return;
      }
      if (this.networkManager && this.networkManager.getSessionId()) {
        const sessionId = this.networkManager.getSessionId();
        const playerState = this.networkManager.getPlayerState(sessionId);
        if (playerState) {
          // Utilise positionPlayer pour positionner via spawnpoint
          this.playerManager.createPlayer(sessionId, playerState);
          this.positionPlayer(this.playerManager.getMyPlayer());
        } else {
          const defaultState = { sessionId: sessionId, name: sessionId.substring(0, 8) };
          this.playerManager.createPlayer(sessionId, defaultState);
          this.positionPlayer(this.playerManager.getMyPlayer());
        }
      }
      this.time.delayedCall(500, checkPlayer);
    };
    this.time.delayedCall(200, checkPlayer);
  }

  setupLavandiaUI() {
    this.add
      .text(16, 80, 'Lavandia - Cité Mystérieuse', {
        font: '16px monospace',
        fill: '#eeeeee',
        padding: { x: 10, y: 5 },
        backgroundColor: 'rgba(138, 43, 226, 0.8)',
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  setupLavandiaEvents() {
    this.time.delayedCall(1500, () => {
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nLavandia\nConnected!');
      }
    });
  }

  cleanup() {
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    super.cleanup();
  }
}