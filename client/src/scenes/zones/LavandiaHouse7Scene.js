import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse7Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse7Scene', 'lavandiahouse7');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse7Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
