import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse4Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse4Scene', 'lavandiahouse4');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse4Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
