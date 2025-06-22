import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse1Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse1Scene', 'lavandiahouse1');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse1Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}
