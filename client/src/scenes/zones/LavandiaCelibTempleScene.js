import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaCelibTempleScene extends BaseZoneScene {
  constructor() {
    super('LavandiaCelibTempleScene', 'lavandiacelibtemple');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaCelibTempleScene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}