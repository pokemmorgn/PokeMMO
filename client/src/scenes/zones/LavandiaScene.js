import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaScene extends BaseZoneScene {
  constructor() {
    super('LavandiaScene', 'Lavandia');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log('[LavandiaScene] Constructor appelé');
  }

  

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
      }
    });
  }

  // ✅ SUPPRIMÉ : positionPlayer() - Le serveur gère les positions maintenant

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
          this.playerManager.createPlayer(sessionId, playerState);
        } else {
          const defaultState = { sessionId: sessionId, name: sessionId.substring(0, 8) };
          this.playerManager.createPlayer(sessionId, defaultState);
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