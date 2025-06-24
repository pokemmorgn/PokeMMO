import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse1Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse1Scene', 'lavandiahouse1');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log('[LavandiaHouse1Scene] Constructor appelé');
  }

  

  
  // ✅ SUPPRIMÉ : positionPlayer() - Le serveur gère les positions maintenant

  create() {
    super.create();
    this.setupLavandiaHouse1UI();
    this.setupLavandiaHouse1Events();
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

  setupLavandiaHouse1UI() {
    this.add
      .text(16, 80, 'Maison 1 - Lavandia', {
        font: '16px monospace',
        fill: '#eeeeee',
        padding: { x: 10, y: 5 },
        backgroundColor: 'rgba(138, 43, 226, 0.8)',
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  setupLavandiaHouse1Events() {
    this.time.delayedCall(1500, () => {
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nMaison 1 - Lavandia\nConnected!');
      }
    });
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse1Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    super.cleanup();
  }
}