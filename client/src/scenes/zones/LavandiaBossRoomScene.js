
import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaBossRoomScene extends BaseZoneScene {
  constructor() {
    super('LavandiaBossRoomScene', 'lavandiabossroom');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaBossRoomScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}