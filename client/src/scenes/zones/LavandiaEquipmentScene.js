import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaEquipmentScene extends BaseZoneScene {
  constructor() {
    super('LavandiaEquipmentScene', 'lavandiaequipment');
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    this.maxPlayerCreationAttempts = 10;
    console.log('[LavandiaEquipmentScene] Constructor appelé');
  }

  create() {
    super.create();
    this.setupLavandiaEquipmentUI();
    this.setupLavandiaEquipmentEvents();
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

  setupLavandiaEquipmentUI() {
    this.add
      .text(16, 80, 'Salle Equipement - Lavandia', {
        font: '16px monospace',
        fill: '#eeeeee',
        padding: { x: 10, y: 5 },
        backgroundColor: 'rgba(34, 139, 34, 0.8)', // couleur différente pour l'exemple
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  setupLavandiaEquipmentEvents() {
    this.time.delayedCall(1500, () => {
      if (this.infoText) {
        this.infoText.setText('PokeWorld MMO\nSalle Equipement - Lavandia\nConnected!');
      }
    });
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaEquipmentScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    this.playerCreationAttempts = 0;
    super.cleanup();
  }
}
