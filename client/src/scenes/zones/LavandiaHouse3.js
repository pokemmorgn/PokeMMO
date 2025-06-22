import { BaseZoneScene } from './BaseZoneScene.js';

export class LavandiaHouse3Scene extends BaseZoneScene {
  constructor() {
    super('LavandiaHouse3Scene', 'lavandiahouse3');
    this.transitionCooldowns = {};
  }

  onPlayerReady(myPlayer) {
    super.onPlayerReady(myPlayer);
    console.log(`[LavandiaHouse3Scene] Mon joueur est prêt à (${myPlayer.x}, ${myPlayer.y})`);
  }

  cleanup() {
    this.transitionCooldowns = {};
    super.cleanup();
  }
}