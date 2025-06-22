import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse2Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse2Scene', 'lavandiahouse2');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse2Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}