import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse5Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse5Scene', 'lavandiahouse5');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse5Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
