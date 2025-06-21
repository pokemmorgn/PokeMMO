import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaScene extends BaseZoneScene {
  constructor() {
    super('LavandiaScene', 'lavandia');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log('[LavandiaScene] Constructor appelé');
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
