import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaCelibiTempleScene extends BaseZoneScene {
  constructor() {
    super('LavandiaCelibiTempleScene', 'lavandiacelibitemple');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaCelibiTempleScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
