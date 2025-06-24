import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaCelebiTempleScene extends BaseZoneScene {
  constructor() {
    super('LavandiaCelebiTempleScene', 'lavandiacelibitemple');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaCelebiTempleScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
